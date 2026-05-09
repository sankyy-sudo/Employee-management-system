import Leave from "../models/Leave.js";
import User from "../models/User.js";
import { calculateLeaveDays } from "../utils/leaveUtils.js";
import { normalizeLeaveBalance } from "../utils/employeeProfile.js";

const POPULATE_EMPLOYEE = {
  path: "employee",
  select: "employeeId name email department designation role leaveBalance phone"
};

const ensureDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid leave dates" };
  }

  if (start > end) {
    return { error: "Start date must be before end date" };
  }

  return { start, end };
};

const applyBalanceDeduction = async (employeeId, leaveType, days) => {
  if (days <= 0) return null;

  const employee = await User.findById(employeeId);

  if (!employee) {
    return { error: "Employee not found" };
  }

  const available = employee.leaveBalance?.[leaveType] ?? 0;

  if (available < days) {
    return { error: `Insufficient ${leaveType} leave balance` };
  }

  employee.leaveBalance[leaveType] = available - days;
  await employee.save();
  return employee.leaveBalance;
};

const restoreBalance = async (employeeId, leaveType, days) => {
  if (days <= 0) return;

  await User.findByIdAndUpdate(employeeId, {
    $inc: {
      [`leaveBalance.${leaveType}`]: days
    }
  });
};

const emitLeaveAttendanceEvent = (req, leave) => {
  const io = req.app.get("io");
  if (!io || !leave) return;

  const employee = leave.employee || {};
  const payload = {
    type: leave.status === "approved" ? "on_leave" : "leave_updated",
    leave,
    employee,
    message: `${employee.name || "Employee"} ${leave.status === "approved" ? "is on leave" : `leave ${leave.status}`}`,
    timestamp: new Date().toISOString()
  };

  io.emit("leave:updated", payload);
  io.emit("attendance:updated", {
    ...payload,
    leave,
    employee
  });
};

export const getLeaveRequests = async (req, res) => {
  const query = req.user.role === "admin" ? {} : { employee: req.user.id };
  const leaves = await Leave.find(query)
    .populate(POPULATE_EMPLOYEE)
    .populate({ path: "approvedBy", select: "name email" })
    .sort({ createdAt: -1 });

  res.json(leaves);
};

export const getLeaveBalance = async (req, res) => {
  const employeeId =
    req.user.role === "admin" && req.query.userId ? req.query.userId : req.user.id;
  const employee = await User.findById(employeeId).select("name leaveBalance");

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  res.json({
    employeeId,
    employeeName: employee.name,
    leaveBalance: normalizeLeaveBalance(employee.leaveBalance)
  });
};

export const applyLeave = async (req, res) => {
  if (req.user.role === "admin") {
    return res.status(403).json({
      message: "Admins cannot apply for leave. They can only approve or reject employee leave requests."
    });
  }

  const { leaveType, startDate, endDate, reason = "", emergencyContact = "", medicalDocuments = [] } = req.body;
  const range = ensureDateRange(startDate, endDate);

  if (range.error) {
    return res.status(400).json({ message: range.error });
  }

  const employee = await User.findById(req.user.id).select("leaveBalance");

  if (!employee) {
    return res.status(404).json({ message: "Employee not found" });
  }

  const { days, holidayDates } = await calculateLeaveDays(range.start, range.end);
  const autoApproved = days === 0;

  if (!autoApproved) {
    const available = employee.leaveBalance?.[leaveType] ?? 0;

    if (available < days) {
      return res.status(400).json({
        message: `Only ${available} ${leaveType} leave day(s) available`
      });
    }
  }

  const leave = await Leave.create({
    employee: req.user.id,
    leaveType,
    startDate: range.start,
    endDate: range.end,
    reason,
    emergencyContact,
    medicalDocuments,
    days,
    holidayDates,
    status: autoApproved ? "approved" : "pending",
    autoApproved,
    approvedBy: autoApproved ? req.user.id : null,
    approvedAt: autoApproved ? new Date() : null,
    adminComment: autoApproved ? "Automatically approved because selected dates are holidays." : ""
  });

  if (autoApproved) {
    const hydrated = await Leave.findById(leave._id).populate(POPULATE_EMPLOYEE);
    emitLeaveAttendanceEvent(req, hydrated);
    return res.status(201).json(hydrated);
  }

  const hydrated = await Leave.findById(leave._id).populate(POPULATE_EMPLOYEE);
  emitLeaveAttendanceEvent(req, hydrated);
  res.status(201).json(hydrated);
};

export const updateLeaveStatus = async (req, res) => {
  const { status, adminComment = "" } = req.body;

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid leave status" });
  }

  const leave = await Leave.findById(req.params.id);

  if (!leave) {
    return res.status(404).json({ message: "Leave request not found" });
  }

  if (leave.status === status) {
    const hydrated = await Leave.findById(leave._id)
      .populate(POPULATE_EMPLOYEE)
      .populate({ path: "approvedBy", select: "name email" });
    return res.json(hydrated);
  }

  if (leave.status === "approved" && status === "rejected") {
    await restoreBalance(leave.employee, leave.leaveType, leave.days);
  }

  if (leave.status !== "approved" && status === "approved") {
    const deductionResult = await applyBalanceDeduction(leave.employee, leave.leaveType, leave.days);

    if (deductionResult?.error) {
      return res.status(400).json({ message: deductionResult.error });
    }
  }

  leave.status = status;
  leave.adminComment = adminComment;
  leave.approvedBy = req.user.id;
  leave.approvedAt = new Date();
  await leave.save();

  const hydrated = await Leave.findById(leave._id)
    .populate(POPULATE_EMPLOYEE)
    .populate({ path: "approvedBy", select: "name email" });
  emitLeaveAttendanceEvent(req, hydrated);
  res.json(hydrated);
};
