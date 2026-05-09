import Task from "../models/Task.js";
import PerformanceReview from "../models/PerformanceReview.js";
import User from "../models/User.js";
import { getCareerGrowth, predictSalary } from "../utils/aiEngine.js";

export const predictEmployeeSalary = async (req, res) => {
  const prediction = predictSalary(req.body);
  res.json(prediction);
};

export const getCareerGrowthPlan = async (req, res) => {
  const employeeId = ["admin", "hr"].includes(req.user.role) && req.query.employeeId
    ? req.query.employeeId
    : req.user.id;

  const [employee, completedTasks, latestReview] = await Promise.all([
    User.findById(employeeId).select("role skills"),
    Task.countDocuments({ assignedTo: employeeId, status: "completed" }),
    PerformanceReview.findOne({ employee: employeeId }).sort({ createdAt: -1 })
  ]);

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json(getCareerGrowth({
    role: employee.role,
    skills: employee.skills,
    completedTasks,
    performanceRating: latestReview?.rating || 3
  }));
};
