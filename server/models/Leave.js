import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  leaveType: {
    type: String,
    enum: ["paid", "sick", "casual", "medical", "emergency"],
    required: true
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, default: "", trim: true },
  emergencyContact: { type: String, default: "", trim: true },
  medicalDocuments: [{
    name: { type: String, default: "", trim: true },
    url: { type: String, default: "", trim: true },
    type: { type: String, default: "Supporting Document", trim: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  days: { type: Number, required: true, min: 0 },
  holidayDates: [{ type: Date }],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  autoApproved: { type: Boolean, default: false },
  adminComment: { type: String, default: "", trim: true },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  approvedAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ employee: 1, status: 1, startDate: -1 });
schema.index({ status: 1, createdAt: -1 });

export default mongoose.model("Leave", schema);
