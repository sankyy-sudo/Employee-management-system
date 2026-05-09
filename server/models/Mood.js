import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  mood: {
    type: String,
    enum: ["happy", "neutral", "stressed", "angry"],
    required: true
  },
  score: { type: Number, min: 1, max: 5, required: true },
  note: { type: String, default: "", trim: true },
  sentiment: {
    type: String,
    enum: ["positive", "neutral", "negative"],
    default: "neutral"
  }
}, { timestamps: true });

schema.index({ employee: 1, createdAt: -1 });
schema.index({ mood: 1, createdAt: -1 });

export default mongoose.model("Mood", schema);
