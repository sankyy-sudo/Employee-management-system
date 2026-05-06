import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  status: {
    type: String,
    enum: ["todo", "inprogress", "completed"],
    default: "todo"
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium"
  },
  dueDate: Date
}, { timestamps: true });

schema.index({ assignedTo: 1, status: 1, dueDate: 1 });

export default mongoose.model("Task", schema);
