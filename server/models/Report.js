import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    task: { type: String, default: "" },
    description: { type: String, default: "" },
    submittedBy: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "reviewed", "approved"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Report", schema);
