import Attendance from "../models/Attendance.js";

const OFFICE_START_HOUR = Number(process.env.OFFICE_START_HOUR || 10);
const DUPLICATE_INTERVAL_MS = Number(process.env.ATTENDANCE_DUPLICATE_INTERVAL_MS || 300000);

export const calculateWorkMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return diff > 0 ? Math.floor(diff / 60000) : 0;
};

export const getDayRange = (value = new Date()) => {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export const getTodayQuery = (userId, value = new Date()) => {
  const { start, end } = getDayRange(value);
  return { userId, date: { $gte: start, $lt: end } };
};

export const deriveStatus = (date = new Date()) => {
  const checkIn = new Date(date);
  return checkIn.getHours() >= OFFICE_START_HOUR ? "Late" : "Present";
};

export const hydrateAttendanceRecord = (id) => Attendance.findById(id)
  .populate("userId", "employeeId name email department designation role status")
  .lean();

export const buildAttendanceMessage = (name = "Employee", eventName, record) => {
  const time = record.checkOut || record.checkIn || record.updatedAt || new Date();
  const formattedTime = new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (eventName === "checked_out") return `${name} checked out at ${formattedTime}`;
  if (eventName === "absent") return `${name} marked absent`;
  if (eventName === "on_leave") return `${name} is on leave`;
  if (eventName === "remote") return `${name} is working remotely`;
  return `${name} checked in at ${formattedTime}`;
};

export const emitAttendanceEvent = async (req, record, actionType) => {
  const io = req.app?.get("io");
  if (!io || !record?._id) return;

  const hydrated = await hydrateAttendanceRecord(record._id);
  if (!hydrated) return;

  const employee = hydrated.userId || {};
  const normalizedStatus = String(hydrated.status || "").toLowerCase();
  let eventName = actionType === "checkout" || hydrated.checkOut ? "checked_out" : "checked_in";

  if (normalizedStatus.includes("absent")) eventName = "absent";
  if (normalizedStatus.includes("leave")) eventName = "on_leave";
  if (normalizedStatus.includes("remote")) eventName = "remote";

  io.emit("attendance:updated", {
    type: eventName,
    record: hydrated,
    employee,
    message: buildAttendanceMessage(employee.name, eventName, hydrated),
    timestamp: new Date().toISOString()
  });
};

export const recordAttendance = async ({
  req,
  userId,
  action = "checkin",
  method = "manual",
  status,
  location,
  faceData,
  faceVerified = false,
  faceMatchScore = null,
  liveness = null,
  biometricData,
  rfidData,
  voiceData,
  notes,
  duplicateIntervalMs = DUPLICATE_INTERVAL_MS
}) => {
  const normalizedAction = String(action || "checkin").toLowerCase();
  const now = new Date();

  const recentDuplicate = await Attendance.findOne({
    userId,
    method,
    createdAt: { $gte: new Date(Date.now() - duplicateIntervalMs) }
  }).sort({ createdAt: -1 });

  if (recentDuplicate && normalizedAction !== "checkout") {
    const error = new Error("Attendance already recorded within the configured duplicate window.");
    error.statusCode = 409;
    error.details = {
      lastAttendance: recentDuplicate,
      timeRemaining: Math.max(1, Math.ceil((recentDuplicate.createdAt.getTime() + duplicateIntervalMs - Date.now()) / 1000))
    };
    throw error;
  }

  let record = await Attendance.findOne(getTodayQuery(userId)).sort({ createdAt: -1 });

  if (!record) {
    record = await Attendance.create({
      userId,
      date: now,
      checkIn: normalizedAction === "checkout" ? null : now,
      checkOut: normalizedAction === "checkout" ? now : null,
      status: status || deriveStatus(now),
      method,
      attendanceType: method,
      isLate: deriveStatus(now) === "Late",
      lateMinutes: Math.max(0, (now.getHours() - OFFICE_START_HOUR) * 60 + now.getMinutes()),
      location,
      faceData,
      faceVerified,
      faceMatchScore,
      liveness,
      biometricData,
      rfidData,
      voiceData,
      notes,
      ipAddress: req?.ip,
      deviceInfo: req?.headers?.["user-agent"] || ""
    });
  } else if (normalizedAction === "checkout") {
    record.checkOut = now;
    record.workMinutes = calculateWorkMinutes(record.checkIn, record.checkOut);
    record.workHours = Number((record.workMinutes / 60).toFixed(2));
    record.method = method;
    record.attendanceType = method;
    record.status = status || record.status || "Present";
    if (location) record.location = location;
    if (notes) record.notes = notes;
  } else {
    record.checkIn = record.checkIn || now;
    record.status = status || deriveStatus(record.checkIn);
    record.method = method;
    record.attendanceType = method;
    record.isLate = record.status === "Late";
    if (location) record.location = location;
    if (faceData) record.faceData = faceData;
    if (typeof faceVerified === "boolean") record.faceVerified = faceVerified;
    if (faceMatchScore !== null) record.faceMatchScore = faceMatchScore;
    if (liveness) record.liveness = liveness;
    if (biometricData) record.biometricData = biometricData;
    if (rfidData) record.rfidData = rfidData;
    if (voiceData) record.voiceData = voiceData;
    if (notes) record.notes = notes;
    await record.save();
  }

  await emitAttendanceEvent(req, record, normalizedAction);
  return record;
};
