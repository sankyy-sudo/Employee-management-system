import mongoose from "mongoose";

const faceDataSchema = new mongoose.Schema({
  embedding: [{ type: Number }],
  matchScore: { type: Number, default: null },
  livenessDetected: { type: Boolean, default: false },
  imageProof: { type: String, default: null }, // path to captured image
  verificationMethod: { type: String, enum: ["manual", "auto"], default: "auto" }
}, { _id: false });

const biometricDataSchema = new mongoose.Schema({
  deviceId: { type: String, default: null },
  fingerprint: { type: String, default: null }, // hash of biometric data
  scanQuality: { type: Number, min: 0, max: 100, default: null },
  verificationAttempts: { type: Number, default: 1 }
}, { _id: false });

const rfidDataSchema = new mongoose.Schema({
  cardId: { type: String, default: null },
  cardNumber: { type: String, default: null },
  cardType: { type: String, enum: ["proximity", "contact", "smart", "smart_card", "nfc"], default: "proximity" }
}, { _id: false });

const schema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  date: { type: Date, required: true, index: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  
  // Attendance status
  status: {
    type: String,
    enum: ["Present", "Late", "Half-day", "Absent", "On Leave", "Remote", "Work From Home"],
    default: "Present"
  },
  
  // Attendance method
  method: {
    type: String,
    enum: ["face_recognition", "voice_recognition", "biometric", "rfid_scan", "rfid_card", "manual", "mobile_app"],
    default: "manual"
  },
  attendanceType: {
    type: String,
    enum: ["face_recognition", "voice_recognition", "biometric", "rfid_scan", "rfid_card", "manual", "mobile_app"],
    default: "manual"
  },
  
  // Duration tracking
  workMinutes: { type: Number, default: 0, min: 0 },
  workHours: { type: Number, default: 0 },
  isLate: { type: Boolean, default: false },
  lateMinutes: { type: Number, default: 0 },
  
  // Face recognition data
  faceData: faceDataSchema,
  faceVerified: { type: Boolean, default: false },
  faceMatchScore: { type: Number, default: null },
  liveness: { type: mongoose.Schema.Types.Mixed, default: null },
  
  voiceData: {
    phrase: { type: String, default: "" },
    transcript: { type: String, default: "" },
    language: { type: String, default: "en-US" },
    confidence: { type: Number, default: null },
    attempts: { type: Number, default: 1 }
  },
  
  // Biometric data
  biometricData: biometricDataSchema,
  
  // RFID data
  rfidData: rfidDataSchema,
  
  // Location tracking
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    address: { type: String, default: null }
  },
  
  // Security & verification
  ipAddress: { type: String, default: null },
  deviceInfo: { type: String, default: null },
  
  // Notes
  notes: { type: String, default: "" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  
  // Audit trail
  isEdited: { type: Boolean, default: false },
  editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  editedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ userId: 1, date: -1 });
schema.index({ userId: 1, checkIn: 1 });
schema.index({ date: 1, status: 1 });
schema.index({ method: 1, createdAt: -1 });

export default mongoose.model("Attendance", schema);
