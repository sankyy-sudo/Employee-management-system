import mongoose from "mongoose";

const schema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reviewPeriod: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  strengths: { type: String, default: "", trim: true },
  improvementAreas: { type: String, default: "", trim: true },
  goals: { type: String, default: "", trim: true },
  status: {
    type: String,
    enum: ["draft", "finalized"],
    default: "finalized"
  }
}, { timestamps: true });

export default mongoose.model("PerformanceReview", schema);
