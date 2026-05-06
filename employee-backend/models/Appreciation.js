import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  recognizedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, default: "", trim: true },
  rewardType: {
    type: String,
    enum: ["appreciation", "award", "bonus", "certificate"],
    default: "appreciation"
  },
  rewardValue: { type: String, default: "", trim: true }
}, { timestamps: true });

export default mongoose.model("Appreciation", schema);
