import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  status: {
    type: String,
    enum: ["Checked In", "Checked Out", "Late", "Absent", "On Leave", "Remote"],
    default: "Checked In"
  },
  workMinutes: { type: Number, default: 0, min: 0 },
  isLate: { type: Boolean, default: false },
  faceVerified: { type: Boolean, default: false },
  faceMatchScore: { type: Number, default: null },
  liveness: {
    blinkDetected: { type: Boolean, default: false },
    headMovementDetected: { type: Boolean, default: false }
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  }
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, checkIn: 1 });

export default mongoose.model("Attendance", schema);
