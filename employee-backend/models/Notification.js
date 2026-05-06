import mongoose from "mongoose";

const schema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  type: {
    type: String,
    enum: ["system", "leave", "task", "message", "payroll", "attendance"],
    default: "system"
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false },
  link: { type: String, default: "", trim: true }
}, { timestamps: true });

schema.index({ recipient: 1, read: 1, createdAt: -1 });

export default mongoose.model("Notification", schema);
