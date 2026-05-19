import Payroll from "../models/Payroll.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

const withNetSalary = (payload) => {
  const basicSalary = Number(payload.basicSalary || 0);
  const hra = Number(payload.hra || 0);
  const allowances = Number(payload.allowances || 0);
  const bonus = Number(payload.bonus || 0);
  const overtimeAmount = Number(payload.overtimeAmount || 0);
  const taxDeduction = Number(payload.taxDeduction || 0);
  const leaveDeduction = Number(payload.leaveDeduction || 0);
  const deductions = Number(payload.deductions || 0) + taxDeduction + leaveDeduction;

  return {
    ...payload,
    basicSalary,
    hra,
    allowances,
    bonus,
    overtimeAmount,
    taxDeduction,
    leaveDeduction,
    deductions,
    netSalary: Math.max(0, basicSalary + hra + allowances + bonus + overtimeAmount - deductions)
  };
};

const emitPayrollEvent = (req, payroll, type = "updated") => {
  const io = req.app.get("io");
  if (!io || !payroll) return;

  io.emit("payroll:updated", {
    type,
    payroll,
    employee: payroll.employee,
    message: `${payroll.employee?.name || "Employee"} payroll ${type}`,
    timestamp: new Date().toISOString()
  });
};

const buildPayslipPdf = (payroll) => {
  const employeeName = payroll.employee?.name || "Employee";
  const lines = [
    "Employee Management System - Payslip",
    `Employee: ${employeeName}`,
    `Department: ${payroll.employee?.department || "N/A"}`,
    `Period: ${payroll.month}/${payroll.year}`,
    `Basic: ${payroll.basicSalary}`,
    `HRA: ${payroll.hra}`,
    `Allowances: ${payroll.allowances}`,
    `Bonus: ${payroll.bonus}`,
    `Overtime: ${payroll.overtimeAmount || 0}`,
    `Tax Deduction: ${payroll.taxDeduction || 0}`,
    `Leave Deduction: ${payroll.leaveDeduction || 0}`,
    `Deductions: ${payroll.deductions}`,
    `Net Salary: ${payroll.netSalary}`
  ];
  const content = lines.map((line, index) => `${index ? "0 -24 Td " : ""}(${line}) Tj`).join("\n");
  const stream = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${content.length + 40} >> stream`,
    "BT /F1 14 Tf 72 730 Td",
    content,
    "ET",
    "endstream endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref\n0 6\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 6 >>",
    "startxref\n0\n%%EOF"
  ].join("\n");

  return Buffer.from(stream);
};

const calculatePayrollPayload = async (payload, generatedBy) => {
  const employee = await User.findById(payload.employee).select("salary");

  if (!employee) {
    const error = new Error("Employee not found");
    error.statusCode = 404;
    throw error;
  }

  const month = Number(payload.month);
  const year = Number(payload.year);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const [attendanceRecords, approvedLeaves] = await Promise.all([
    Attendance.find({
      userId: payload.employee,
      checkIn: { $ne: null },
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }).select("checkIn checkOut workMinutes status isLate"),
    Leave.find({
      employee: payload.employee,
      status: "approved",
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart }
    }).select("days")
  ]);

  const monthlySalary = Number(payload.basicSalary || employee.salary || 0);
  const workingDays = 22;
  const attendanceDays = attendanceRecords.length;
  const lateEntries = attendanceRecords.filter((record) => record.isLate || String(record.status || "").toLowerCase().includes("late")).length;
  const unpaidLeaveDays = approvedLeaves.reduce((total, leave) => total + Number(leave.days || 0), 0);
  const attendancePercentage = Math.min(100, Math.round((attendanceDays / workingDays) * 100));
  const overtimeHours = attendanceRecords.reduce((total, record) => total + Math.max(0, Number(record.workMinutes || 0) / 60 - 8), 0);
  const overtimeAmount = payload.overtimeAmount !== undefined
    ? Number(payload.overtimeAmount || 0)
    : Math.round((monthlySalary / workingDays / 8) * overtimeHours * 1.5);
  const leaveDeduction = Math.round((monthlySalary / workingDays) * Math.max(unpaidLeaveDays, 0));
  const attendanceDeduction = attendanceDays ? 0 : Math.round(monthlySalary / workingDays);
  const lateDeduction = Math.round((monthlySalary / workingDays) * (lateEntries * 0.1));
  const taxDeduction = payload.taxDeduction !== undefined
    ? Number(payload.taxDeduction || 0)
    : Math.round(monthlySalary * 0.1);

  return withNetSalary({
    ...payload,
    basicSalary: monthlySalary,
    attendancePercentage,
    overtimeHours: Number(overtimeHours.toFixed(1)),
    overtimeAmount,
    taxDeduction,
    leaveDeduction,
    deductions: Number(payload.deductions || 0) + attendanceDeduction + lateDeduction,
    notes: payload.notes || `Auto calculated: ${attendanceDays} attendance day(s), ${lateEntries} late entrie(s), ${unpaidLeaveDays} leave day(s).`,
    generatedBy
  });
};

export const getPayrolls = async (req, res) => {
  const query = {};

  if (req.query.employeeId) {
    query.employee = req.query.employeeId;
  }

  const payrolls = await Payroll.find(query)
    .populate({ path: "employee", select: "employeeId name email department designation salary" })
    .populate({ path: "generatedBy", select: "name role" })
    .sort({ year: -1, month: -1, createdAt: -1 });

  res.json(payrolls);
};

export const getMyPayrolls = async (req, res) => {
  const payrolls = await Payroll.find({ employee: req.user.id })
    .populate({ path: "employee", select: "employeeId name email department designation salary" })
    .populate({ path: "generatedBy", select: "name role" })
    .sort({ year: -1, month: -1, createdAt: -1 });

  res.json(payrolls);
};

export const createPayroll = async (req, res) => {
  const payload = await calculatePayrollPayload(req.body, req.user.id);
  const payroll = await Payroll.create(payload);

  const populated = await Payroll.findById(payroll._id)
    .populate({ path: "employee", select: "employeeId name email department designation salary" })
    .populate({ path: "generatedBy", select: "name role" });

  emitPayrollEvent(req, populated, "generated");
  res.status(201).json(populated);
};

export const updatePayroll = async (req, res) => {
  const payload = withNetSalary(req.body);

  if (payload.status === "paid" && !payload.paidAt) {
    payload.paidAt = new Date();
  }

  const payroll = await Payroll.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  })
    .populate({ path: "employee", select: "employeeId name email department designation salary" })
    .populate({ path: "generatedBy", select: "name role" });

  if (!payroll) {
    return res.status(404).json({ message: "Payroll not found" });
  }

  emitPayrollEvent(req, payroll, payload.status === "approved" ? "approved" : "updated");
  res.json(payroll);
};

export const downloadPayslip = async (req, res) => {
  const query = { _id: req.params.id };

  const payroll = await Payroll.findOne(query).populate({ path: "employee", select: "employeeId name email department designation" });

  if (!payroll) {
    return res.status(404).json({ message: "Payroll not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=payslip-${payroll.month}-${payroll.year}.pdf`);
  res.send(buildPayslipPdf(payroll));
};
