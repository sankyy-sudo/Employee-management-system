import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { cosineSimilarity, hasBasicLiveness } from "../utils/faceMatch.js";
import { calculateWorkMinutes, getDayRange, recordAttendance } from "../services/attendanceService.js";
import mongoose from "mongoose";

const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.86);
const VOICE_COMMANDS = ["mark my attendance", "मेरी उपस्थिति दर्ज करें", "marquer ma présence", "marcar mi asistencia"];

export const enrollFace = async (req, res) => {
  const role = String(req.user.role || "").toLowerCase();
  const employeeId =
    ["admin", "hr"].includes(role) && req.body.employeeId ? req.body.employeeId : req.user.id;
  const { embedding, model = "face-api.js" } = req.body;

  if (!Array.isArray(embedding) || embedding.length < 32) {
    return res.status(400).json({ message: "A valid face embedding is required" });
  }

  const user = await User.findByIdAndUpdate(
    employeeId,
    {
      faceProfile: {
        embedding,
        model,
        enrolledAt: new Date(),
        updatedAt: new Date()
      }
    },
    { new: true }
  ).select("-password -refreshTokenHash");

  if (!user) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json({ message: "Face profile enrolled", faceProfile: user.faceProfile });
};

export const markAttendance = async (req, res) => {
  const { action, status, faceEmbedding, liveness = {}, location, method = "manual" } = req.body;
  const role = String(req.user.role || "").toLowerCase();
  const userId =
    ["admin", "hr"].includes(role) && req.body.userId ? req.body.userId : req.user.id;

  let faceVerified = false;
  let faceMatchScore = null;

  if (action !== "checkout") {
    const employee = await User.findById(userId).select("faceProfile");
    const storedEmbedding = employee?.faceProfile?.embedding || [];

    if (storedEmbedding.length) {
      if (!Array.isArray(faceEmbedding) || faceEmbedding.length < 32) {
        return res.status(400).json({ message: "A valid face embedding is required for verification" });
      }

      if (!hasBasicLiveness(liveness)) {
        return res.status(400).json({ message: "Liveness check failed. Blink or move your head and try again." });
      }

      faceMatchScore = cosineSimilarity(storedEmbedding, faceEmbedding);
      faceVerified = faceMatchScore >= FACE_MATCH_THRESHOLD;

      if (!faceVerified) {
        return res.status(403).json({ message: "Face verification failed", faceMatchScore });
      }
    }
  }

  const record = await recordAttendance({
    req,
    userId,
    action,
    method: method === "face_recognition" || faceEmbedding ? "face_recognition" : "manual",
    status,
    location,
    faceVerified,
    faceMatchScore,
    liveness,
    faceData: faceEmbedding ? {
      embedding: faceEmbedding,
      matchScore: faceMatchScore,
      livenessDetected: hasBasicLiveness(liveness)
    } : undefined
  });
  res.json(record);
};

export const markVoiceAttendance = async (req, res) => {
  const { transcript = "", language = "en-US", confidence = null, attempts = 1, action = "checkin" } = req.body;
  const normalized = String(transcript).trim().toLowerCase();
  const valid = VOICE_COMMANDS.some((phrase) => normalized.includes(phrase.toLowerCase()));

  if (!valid) {
    return res.status(400).json({
      message: "Voice command not recognized. Please say: Mark my attendance",
      transcript,
      expectedPhrase: "Mark my attendance"
    });
  }

  const record = await recordAttendance({
    req,
    userId: req.user.id,
    action,
    method: "voice_recognition",
    voiceData: {
      phrase: "Mark my attendance",
      transcript,
      language,
      confidence,
      attempts
    }
  });

  res.status(201).json({ message: "Voice attendance marked successfully", attendance: record });
};

export const getAttendance = async (req, res) => {
  const filter = {};
  const role = String(req.user.role || "").toLowerCase();

  if (req.query.userId && ["admin", "hr"].includes(role)) {
    filter.userId = req.query.userId;
  } else if (!["admin", "hr"].includes(role)) {
    filter.userId = req.user.id;
  }

  const data = await Attendance.find(filter)
    .populate("userId", "employeeId name email department designation role status")
    .sort({ createdAt: -1 });
  res.json(data);
};

export const getAttendanceSummary = async (req, res) => {
  const today = new Date();
  const month = Number(req.query.month ?? today.getMonth() + 1);
  const year = Number(req.query.year ?? today.getFullYear());
  const role = String(req.user.role || "").toLowerCase();
  const userId =
    req.query.userId && ["admin", "hr"].includes(role) ? req.query.userId : req.user.id;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await Attendance.find({
    userId,
    createdAt: { $gte: monthStart, $lte: monthEnd }
  })
    .populate("userId", "employeeId name email department designation role status")
    .sort({ createdAt: -1 });

  const presentDays = records.filter((record) => Boolean(record.checkIn)).length;
  const checkedOutDays = records.filter((record) => Boolean(record.checkOut)).length;
  const totalWorkingMinutes = records.reduce((total, record) => {
    if (!record.checkIn || !record.checkOut) return total;
    return total + calculateWorkMinutes(record.checkIn, record.checkOut);
  }, 0);

  res.json({
    month,
    year,
    userId,
    stats: {
      presentDays,
      checkedOutDays,
      totalRecords: records.length,
      totalWorkingHours: (totalWorkingMinutes / 60).toFixed(1)
    },
    records
  });
};

export const getAttendanceAnalytics = async (req, res) => {
  const role = String(req.user.role || "").toLowerCase();
  const { start, end } = getDayRange(req.query.date ? new Date(req.query.date) : new Date());
  const filter = { date: { $gte: start, $lt: end } };

  if (!["admin", "hr"].includes(role)) {
    filter.userId = new mongoose.Types.ObjectId(req.user.id);
  } else if (req.query.userId) {
    if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    filter.userId = new mongoose.Types.ObjectId(req.query.userId);
  }

  const [byMethod, byStatus, recentLogs] = await Promise.all([
    Attendance.aggregate([
      { $match: filter },
      { $group: { _id: "$method", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Attendance.aggregate([
      { $match: filter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Attendance.find(filter)
      .populate("userId", "employeeId name email department designation")
      .sort({ createdAt: -1 })
      .limit(30)
  ]);

  res.json({ date: start, byMethod, byStatus, recentLogs });
};
