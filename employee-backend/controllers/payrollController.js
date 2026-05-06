import Payroll from "../models/Payroll.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

const canManage = (role) => ["admin", "hr"].includes(role);

const withNetSalary = (payload) => {
  const basicSalary = Number(payload.basicSalary || 0);
  const hra = Number(payload.hra || 0);
  const allowances = Number(payload.allowances || 0);
  const bonus = Number(payload.bonus || 0);
  const deductions = Number(payload.deductions || 0);

  return {
    ...payload,
    basicSalary,
    hra,
    allowances,
    bonus,
    deductions,
    netSalary: basicSalary + hra + allowances + bonus - deductions
  };
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
  const [attendanceDays, approvedLeaves] = await Promise.all([
    Attendance.countDocuments({
      userId: payload.employee,
      checkIn: { $ne: null },
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }),
    Leave.find({
      employee: payload.employee,
      status: "approved",
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart }
    }).select("days")
  ]);

  const monthlySalary = Number(payload.basicSalary || employee.salary || 0);
  const workingDays = 22;
  const unpaidLeaveDays = approvedLeaves.reduce((total, leave) => total + Number(leave.days || 0), 0);
  const leaveDeduction = Math.round((monthlySalary / workingDays) * Math.max(unpaidLeaveDays, 0));
  const attendanceDeduction = attendanceDays ? 0 : Math.round(monthlySalary / workingDays);
  const taxDeduction = payload.taxDeduction !== undefined
    ? Number(payload.taxDeduction || 0)
    : Math.round(monthlySalary * 0.1);

  return withNetSalary({
    ...payload,
    basicSalary: monthlySalary,
    deductions: Number(payload.deductions || 0) + leaveDeduction + attendanceDeduction + taxDeduction,
    notes: payload.notes || `Auto calculated: ${attendanceDays} attendance day(s), ${unpaidLeaveDays} leave day(s).`,
    generatedBy
  });
};

export const getPayrolls = async (req, res) => {
  const query = {};

  if (canManage(req.user.role)) {
    if (req.query.employeeId) {
      query.employee = req.query.employeeId;
    }
  } else {
    query.employee = req.user.id;
  }

  const payrolls = await Payroll.find(query)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "generatedBy", select: "name role" })
    .sort({ year: -1, month: -1, createdAt: -1 });

  res.json(payrolls);
};

export const createPayroll = async (req, res) => {
  const payload = await calculatePayrollPayload(req.body, req.user.id);
  const payroll = await Payroll.create(payload);

  const populated = await Payroll.findById(payroll._id)
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "generatedBy", select: "name role" });

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
    .populate({ path: "employee", select: "name email department" })
    .populate({ path: "generatedBy", select: "name role" });

  if (!payroll) {
    return res.status(404).json({ message: "Payroll not found" });
  }

  res.json(payroll);
};

export const downloadPayslip = async (req, res) => {
  const query = { _id: req.params.id };

  if (!canManage(req.user.role)) {
    query.employee = req.user.id;
  }

  const payroll = await Payroll.findOne(query).populate({ path: "employee", select: "name email department" });

  if (!payroll) {
    return res.status(404).json({ message: "Payroll not found" });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=payslip-${payroll.month}-${payroll.year}.pdf`);
  res.send(buildPayslipPdf(payroll));
};
