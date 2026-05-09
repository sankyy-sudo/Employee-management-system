import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  role: { type: String, default: "Contributor", trim: true },
  joiningDate: { type: Date, default: Date.now },
  deadline: { type: Date, default: null },
  notes: { type: String, default: "", trim: true },
  progress: { type: Number, default: 0, min: 0, max: 100 }
}, { _id: false });

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  dueDate: { type: Date, default: null },
  completed: { type: Boolean, default: false }
}, { _id: false });

const schema = new mongoose.Schema({
  projectId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    default: () => `PRJ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  },
  name: { type: String, required: true, trim: true },
  clientName: { type: String, default: "", trim: true },
  description: { type: String, default: "", trim: true },
  startDate: { type: Date, default: Date.now },
  deadline: { type: Date, default: null },
  timezone: { type: String, default: "Asia/Kolkata", trim: true },
  status: {
    type: String,
    enum: ["Active", "Completed", "Pending", "In Review", "Delayed", "Cancelled"],
    default: "Pending"
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium"
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  assignments: [assignmentSchema],
  milestones: [milestoneSchema],
  notes: { type: String, default: "", trim: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
}, { timestamps: true });

schema.index({ status: 1, deadline: 1 });
schema.index({ "assignments.employee": 1 });

export default mongoose.model("Project", schema);
