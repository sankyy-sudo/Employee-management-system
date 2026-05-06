import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    agenda: { type: String, default: "" },
    scheduledFor: { type: Date, required: true },
    attendees: [{ type: String }],
    meetingLink: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", schema);
