import Task from "../models/Task.js";
import User from "../models/User.js";

export const getTasks = async (req, res) => {
  const filter = {};

  if (req.user.role === "employee") {
    filter.assignedTo = req.user.id;
  } else if (req.query.assignedTo) {
    const isObjectId = String(req.query.assignedTo).match(/^[0-9a-fA-F]{24}$/);
    const employee = await User.findOne(
      isObjectId ? { _id: req.query.assignedTo } : { name: req.query.assignedTo }
    ).select("_id");
    filter.assignedTo = employee?._id || req.query.assignedTo;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const tasks = await Task.find(filter)
    .populate({ path: "assignedTo", select: "name department" })
    .populate({ path: "assignedBy", select: "name role" })
    .sort({ createdAt: -1 });
  res.json(tasks);
};

export const createTask = async (req, res) => {
  const payload = { ...req.body, priority: String(req.body.priority || "medium").toLowerCase() };

  if (req.user.role === "employee") {
    payload.assignedTo = req.user.id;
  } else if (payload.assignedTo && !String(payload.assignedTo).match(/^[0-9a-fA-F]{24}$/)) {
    const employee = await User.findOne({ name: payload.assignedTo }).select("_id");
    payload.assignedTo = employee?._id;
  }

  payload.assignedBy = req.user.id;

  const task = await Task.create(payload);
  res.status(201).json(task);
};

export const updateTask = async (req, res) => {
  const existingTask = await Task.findById(req.params.id);

  if (!existingTask) {
    return res.status(404).json({ message: "Task not found" });
  }

  if (req.user.role === "employee" && String(existingTask.assignedTo) !== req.user.id) {
    return res.status(403).json({ message: "Access denied" });
  }

  const payload = req.user.role === "employee"
    ? { status: req.body.status }
    : { ...req.body, priority: req.body.priority ? String(req.body.priority).toLowerCase() : req.body.priority };

  const task = await Task.findByIdAndUpdate(req.params.id, payload, { new: true });

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  res.json(task);
};
