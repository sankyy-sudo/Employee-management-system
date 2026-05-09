import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { sanitizeEmployeePayload, serializeEmployee } from "../utils/employeeProfile.js";

export const getEmployees = async (req, res) => {
  const query = req.query.role ? { role: req.query.role } : {};
  const employees = await User.find(query).select("-password").sort({ createdAt: -1 });
  res.json(employees.map(serializeEmployee));
};

export const createEmployee = async (req, res) => {
  const payload = sanitizeEmployeePayload(req.body);

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  const employee = await User.create(payload);
  const safeEmployee = await User.findById(employee._id).select("-password");
  res.status(201).json(serializeEmployee(safeEmployee));
};

export const updateEmployee = async (req, res) => {
  const canManageEmployee = ["admin", "hr"].includes(req.user.role);

  if (!canManageEmployee && req.user.id !== req.params.id) {
    return res.status(403).json({ message: "Access denied" });
  }

  const payload = sanitizeEmployeePayload(req.body);

  if (!canManageEmployee) {
    delete payload.role;
    delete payload.status;
    delete payload.leaveBalance;
  }

  if (payload.password) {
    payload.password = await bcrypt.hash(payload.password, 10);
  }

  const employee = await User.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  }).select("-password");

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json(serializeEmployee(employee));
};

export const deleteEmployee = async (req, res) => {
  const employee = await User.findByIdAndDelete(req.params.id);

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json({ message: "Employee deleted successfully" });
};
