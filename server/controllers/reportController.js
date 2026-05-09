import Report from "../models/Report.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Payroll from "../models/Payroll.js";

export const getReports = async (req, res) => {
  const filter = {};

  if (req.user.role === "employee") {
    filter.submittedBy = req.user.name;
  } else if (req.query.submittedBy) {
    filter.submittedBy = req.query.submittedBy;
  }

  const reports = await Report.find(filter).sort({ submittedAt: -1 });
  res.json(reports);
};

export const createReport = async (req, res) => {
  const payload = {
    ...req.body,
    submittedBy: req.user.role === "employee" ? req.user.name : req.body.submittedBy
  };
  const report = await Report.create(payload);
  res.status(201).json(report);
};

export const updateReport = async (req, res) => {
  const existingReport = await Report.findById(req.params.id);

  if (!existingReport) {
    return res.status(404).json({ message: "Report not found" });
  }

  if (req.user.role === "employee") {
    return res.status(403).json({ message: "Employees cannot approve or modify report status" });
  }

  const report = await Report.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  res.json(report);
};

export const deleteReport = async (req, res) => {
  if (req.user.role === "employee") {
    return res.status(403).json({ message: "Employees cannot delete reports" });
  }

  const report = await Report.findByIdAndDelete(req.params.id);

  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  res.json({ message: "Report deleted successfully" });
};

const getMonthlyData = async (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  const [attendance, leaves, payrolls] = await Promise.all([
    Attendance.find({ createdAt: { $gte: start, $lte: end } }).populate({ path: "userId", select: "name department" }),
    Leave.find({ createdAt: { $gte: start, $lte: end } }).populate({ path: "employee", select: "name department" }),
    Payroll.find({ year, month }).populate({ path: "employee", select: "name department" })
  ]);

  return { attendance, leaves, payrolls, start, end };
};

const buildSummary = ({ attendance, leaves, payrolls }) => ({
  attendanceRecords: attendance.length,
  lateCheckIns: attendance.filter((item) => item.isLate).length,
  faceVerifiedCheckIns: attendance.filter((item) => item.faceVerified).length,
  leaveRequests: leaves.length,
  approvedLeaves: leaves.filter((item) => item.status === "approved").length,
  payrollCount: payrolls.length,
  payrollTotal: payrolls.reduce((total, payroll) => total + Number(payroll.netSalary || 0), 0)
});

const toCsv = (summary) => [
  "Metric,Value",
  `Attendance Records,${summary.attendanceRecords}`,
  `Late Check-ins,${summary.lateCheckIns}`,
  `Face Verified Check-ins,${summary.faceVerifiedCheckIns}`,
  `Leave Requests,${summary.leaveRequests}`,
  `Approved Leaves,${summary.approvedLeaves}`,
  `Payroll Count,${summary.payrollCount}`,
  `Payroll Total,${summary.payrollTotal}`
].join("\n");

const toPdfBuffer = (summary, month, year) => {
  const lines = [
    `Monthly HR Report ${month}/${year}`,
    `Attendance Records: ${summary.attendanceRecords}`,
    `Late Check-ins: ${summary.lateCheckIns}`,
    `Face Verified Check-ins: ${summary.faceVerifiedCheckIns}`,
    `Leave Requests: ${summary.leaveRequests}`,
    `Approved Leaves: ${summary.approvedLeaves}`,
    `Payroll Count: ${summary.payrollCount}`,
    `Payroll Total: ${summary.payrollTotal}`
  ];
  const stream = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${120 + lines.join("").length} >> stream`,
    "BT /F1 16 Tf 72 730 Td",
    lines.map((line, index) => `${index ? "0 -28 Td " : ""}(${line}) Tj`).join("\n"),
    "ET",
    "endstream endobj",
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref\n0 6\n0000000000 65535 f \ntrailer << /Root 1 0 R /Size 6 >>",
    "startxref\n0\n%%EOF"
  ].join("\n");

  return Buffer.from(stream);
};

export const getMonthlyReport = async (req, res) => {
  const now = new Date();
  const month = Number(req.query.month || now.getMonth() + 1);
  const year = Number(req.query.year || now.getFullYear());
  const format = req.query.format || "json";
  const data = await getMonthlyData(month, year);
  const summary = buildSummary(data);

  if (format === "excel" || format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=monthly-report-${year}-${month}.csv`);
    return res.send(toCsv(summary));
  }

  if (format === "pdf") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=monthly-report-${year}-${month}.pdf`);
    return res.send(toPdfBuffer(summary, month, year));
  }

  res.json({
    month,
    year,
    summary,
    charts: [
      { name: "Attendance", value: summary.attendanceRecords },
      { name: "Late", value: summary.lateCheckIns },
      { name: "Leaves", value: summary.leaveRequests },
      { name: "Payrolls", value: summary.payrollCount }
    ]
  });
};
