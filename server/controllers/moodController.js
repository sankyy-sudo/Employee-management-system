import Mood from "../models/Mood.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { analyzeMood } from "../utils/aiEngine.js";

const moodScore = {
  happy: 5,
  neutral: 3,
  stressed: 2,
  angry: 1
};

const getSentiment = (mood, note = "") => {
  const negativeWords = ["burnout", "tired", "overloaded", "sad", "angry", "stress"];
  if (["stressed", "angry"].includes(mood) || negativeWords.some((word) => note.toLowerCase().includes(word))) {
    return "negative";
  }
  return mood === "happy" ? "positive" : "neutral";
};

export const createMood = async (req, res) => {
  const { mood, note = "" } = req.body;

  if (!moodScore[mood]) {
    return res.status(400).json({ message: "Invalid mood" });
  }

  const entry = await Mood.create({
    employee: req.user.id,
    mood,
    score: moodScore[mood],
    note,
    sentiment: getSentiment(mood, note)
  });

  const recent = await Mood.find({ employee: req.user.id }).sort({ createdAt: -1 }).limit(7);
  const analytics = analyzeMood(recent);

  if (analytics.burnoutRisk === "high") {
    const managers = await User.find({ role: { $in: ["admin", "hr"] } }).select("_id");
    await Notification.insertMany(managers.map((manager) => ({
      recipient: manager._id,
      sender: req.user.id,
      type: "system",
      title: "Mood burnout alert",
      message: `${req.user.name || "An employee"} has multiple stressed mood entries this week.`,
      link: "/ai"
    })));
  }

  res.status(201).json({ entry, analytics });
};

export const getMoodAnalytics = async (req, res) => {
  const employeeId = ["admin", "hr"].includes(req.user.role) && req.query.employeeId
    ? req.query.employeeId
    : req.user.id;

  const moods = await Mood.find({ employee: employeeId }).sort({ createdAt: -1 }).limit(30);
  res.json(analyzeMood(moods));
};

export const getMoodEntries = async (req, res) => {
  const query = ["admin", "hr"].includes(req.user.role) ? {} : { employee: req.user.id };
  const moods = await Mood.find(query)
    .populate({ path: "employee", select: "name department" })
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(moods);
};
