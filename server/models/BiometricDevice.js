import mongoose from "mongoose";

const schema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  deviceName: { type: String, required: true },
  deviceType: {
    type: String,
    enum: ["fingerprint_scanner", "facial_recognition", "iris_scanner", "vein_scanner"],
    required: true
  },
  manufacturer: { type: String, default: "" },
  model: { type: String, default: "" },
  serialNumber: { type: String, unique: true, sparse: true },

  // Location
  location: {
    building: { type: String, default: "" },
    floor: { type: String, default: "" },
    room: { type: String, default: "" }
  },

  // Connection info
  ipAddress: { type: String, default: null },
  macAddress: { type: String, default: null },
  port: { type: Number, default: null },

  // Status
  status: {
    type: String,
    enum: ["active", "inactive", "maintenance", "disconnected"],
    default: "inactive"
  },
  isOnline: { type: Boolean, default: false },
  lastConnected: { type: Date, default: null },

  // Configuration
  attendanceDelay: { type: Number, default: 300000 },
  verificationThreshold: { type: Number, min: 0, max: 100, default: 95 },
  maxRetries: { type: Number, default: 3 },

  // Assigned to
  assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Admin notes
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

schema.index({ status: 1, isOnline: 1 });
schema.index({ location: 1 });

export default mongoose.model("BiometricDevice", schema);