import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { cosineSimilarity, hasBasicLiveness } from "../utils/faceMatch.js";

const OFFICE_START_HOUR = Number(process.env.OFFICE_START_HOUR || 10);
const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD || 0.86);

const getTodayQuery = (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { userId, createdAt: { $gte: today } };
};

const calculateWorkMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return diff > 0 ? Math.floor(diff / 60000) : 0;
};

export const enrollFace = async (req, res) => {
  const employeeId =
    ["admin", "hr"].includes(req.user.role) && req.body.employeeId ? req.body.employeeId : req.user.id;
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
  const { action, status, checkIn, checkOut, faceEmbedding, liveness = {}, location } = req.body;
  const userId =
    ["admin", "hr"].includes(req.user.role) && req.body.userId ? req.body.userId : req.user.id;

  let faceVerified = false;
  let faceMatchScore = null;

  if (action !== "checkout") {
    const employee = await User.findById(userId).select("faceProfile");
    const storedEmbedding = employee?.faceProfile?.embedding || [];

    if (storedEmbedding.length) {
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

  let record = await Attendance.findOne(getTodayQuery(userId)).sort({ createdAt: -1 });
  const nextCheckIn = checkIn ? new Date(checkIn) : new Date();
  const isLate = nextCheckIn.getHours() >= OFFICE_START_HOUR;

  if (!record) {
    record = await Attendance.create({
      userId,
      checkIn: action === "checkout" ? null : nextCheckIn,
      checkOut: checkOut ? new Date(checkOut) : null,
      status: status || (isLate ? "Late" : action === "checkout" ? "Checked Out" : "Checked In"),
      isLate,
      faceVerified,
      faceMatchScore,
      liveness,
      location
    });

    return res.status(201).json(record);
  }

  if (action === "checkout" || checkOut) {
    record.checkOut = checkOut ? new Date(checkOut) : new Date();
    record.workMinutes = calculateWorkMinutes(record.checkIn, record.checkOut);
    record.status = status || "Checked Out";
  } else {
    record.checkIn = record.checkIn || nextCheckIn;
    record.isLate = isLate;
    record.status = status || (isLate ? "Late" : "Checked In");
    record.faceVerified = faceVerified;
    record.faceMatchScore = faceMatchScore;
    record.liveness = liveness;
    record.location = location;
  }

  await record.save();
  res.json(record);
};

export const getAttendance = async (req, res) => {
  const filter = {};

  if (req.query.userId && ["admin", "hr"].includes(req.user.role)) {
    filter.userId = req.query.userId;
  } else if (req.user.role === "employee") {
    filter.userId = req.user.id;
  }

  const data = await Attendance.find(filter).sort({ createdAt: -1 });
  res.json(data);
};

export const getAttendanceSummary = async (req, res) => {
  const today = new Date();
  const month = Number(req.query.month ?? today.getMonth() + 1);
  const year = Number(req.query.year ?? today.getFullYear());
  const userId =
    req.query.userId && ["admin", "hr"].includes(req.user.role) ? req.query.userId : req.user.id;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await Attendance.find({
    userId,
    createdAt: { $gte: monthStart, $lte: monthEnd }
  }).sort({ createdAt: -1 });

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
