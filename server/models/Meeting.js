import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    agenda: { type: String, default: "" },
    scheduledFor: { type: Date, required: true },
    durationMinutes: { type: Number, default: 30, min: 5 },
    attendees: [{ type: String }],
    organizer: { type: String, default: "", trim: true },
    department: { type: String, default: "", trim: true },
    type: {
      type: String,
      enum: ["team-sync", "one-on-one", "client-call", "planning", "review"],
      default: "team-sync"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium"
    },
    meetingLink: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    }
  },
  { timestamps: true }
);

schema.index({ scheduledFor: 1, status: 1 });

export default mongoose.model("Meeting", schema);
