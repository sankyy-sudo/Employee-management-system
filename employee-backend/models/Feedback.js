import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  category: {
    type: String,
    enum: ["self", "manager", "hr", "peer"],
    default: "self"
  },
  message: { type: String, required: true, trim: true },
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "needs_attention"],
    default: "neutral"
  },
  visibility: {
    type: String,
    enum: ["private", "shared"],
    default: "private"
  },
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open"
  }
}, { timestamps: true });

export default mongoose.model("Feedback", schema);
