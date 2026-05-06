import User from "../models/User.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";
import Attendance from "../models/Attendance.js";
import Task from "../models/Task.js";
import Report from "../models/Report.js";
import Document from "../models/Document.js";
import Payroll from "../models/Payroll.js";
import PerformanceReview from "../models/PerformanceReview.js";
import Appreciation from "../models/Appreciation.js";
import Feedback from "../models/Feedback.js";
import { getProfileCompletion, normalizeLeaveBalance } from "../utils/employeeProfile.js";

export const getDashboardSummary = async (req, res) => {
  const today = startOfDay();
  const onlineThreshold = new Date(Date.now() - 10 * 60 * 1000);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [employees, onlineEmployees, pendingLeaveApprovals, upcomingHolidays, employeeList, pendingLeaves, departmentWiseEmployees, attendanceThisMonth, skillDistributionRaw, leavesTakenThisMonth, totalDocuments, payrollsProcessed, performanceAverageRaw, appreciationsThisMonth, openFeedbackCount] =
    await Promise.all([
      User.countDocuments({ role: "employee" }),
      User.countDocuments({ role: "employee", lastSeenAt: { $gte: onlineThreshold } }),
      Leave.countDocuments({ status: "pending" }),
      Holiday.find({ date: { $gte: today } }).sort({ date: 1 }).limit(5),
      User.find({ role: "employee" })
        .select("-password")
        .sort({ createdAt: -1 })
        .limit(6),
      Leave.find({ status: "pending" })
        .populate({ path: "employee", select: "name department" })
        .sort({ createdAt: -1 })
        .limit(6),
      User.aggregate([
        { $match: { role: "employee" } },
        { $group: { _id: { $ifNull: ["$department", "Unassigned"] }, count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } }
      ]),
      Attendance.countDocuments({ createdAt: { $gte: monthStart } }),
      User.aggregate([
        { $match: { role: "employee" } },
        { $unwind: { path: "$skills", preserveNullAndEmptyArrays: false } },
        { $group: { _id: "$skills", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 8 }
      ]),
      Leave.countDocuments({ status: "approved", approvedAt: { $gte: monthStart } }),
      Document.countDocuments(),
      Payroll.countDocuments({ createdAt: { $gte: monthStart } }),
      PerformanceReview.aggregate([
        { $group: { _id: null, averageRating: { $avg: "$rating" } } }
      ]),
      Appreciation.countDocuments({ createdAt: { $gte: monthStart } }),
      Feedback.countDocuments({ status: "open" })
    ]);

  const employeeProgress = employeeList.map((employee) => ({
    _id: employee._id,
    name: employee.name,
    department: employee.department,
    profileCompletion: getProfileCompletion(employee)
  }));

  const onlineList = await User.find({
    role: "employee",
    lastSeenAt: { $gte: onlineThreshold }
  })
    .select("name department lastSeenAt")
    .sort({ lastSeenAt: -1 })
    .limit(6);

  const averageAttendancePercentage = employees
    ? Math.round((attendanceThisMonth / employees / Math.max(today.getDate(), 1)) * 100)
    : 0;

  const departmentBreakdown = departmentWiseEmployees.map((item) => ({
    department: item._id || "Unassigned",
    count: item.count
  }));

  const skillDistribution = skillDistributionRaw.map((item) => ({
    skill: item._id,
    count: item.count
  }));

  const averagePerformanceRating = performanceAverageRaw[0]?.averageRating
    ? Number(performanceAverageRaw[0].averageRating.toFixed(1))
    : 0;

  res.json({
    stats: {
      totalEmployees: employees,
      onlineEmployees,
      pendingLeaveApprovals,
      upcomingHolidays: upcomingHolidays.length,
      leavesTakenThisMonth,
      attendancePercentage: averageAttendancePercentage,
      totalDocuments,
      payrollsProcessed,
      averagePerformanceRating,
      appreciationsThisMonth,
      openFeedbackCount
    },
    onlineList,
    employeeProgress,
    pendingLeaves,
    upcomingHolidays,
    departmentBreakdown,
    skillDistribution
  });
};

export const getEmployeeDashboardSummary = async (req, res) => {
  const today = startOfDay();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  monthEnd.setHours(23, 59, 59, 999);

  const [employee, tasks, attendanceRecords, reports, holidays, approvedLeaves] = await Promise.all([
    User.findById(req.user.id).select("-password"),
    Task.find({ assignedTo: req.user.id }).sort({ createdAt: -1 }),
    Attendance.find({
      userId: req.user.id,
      createdAt: { $gte: monthStart, $lte: monthEnd }
    }).sort({ createdAt: -1 }),
    Report.find({ submittedBy: req.user.name }).sort({ submittedAt: -1 }),
    Holiday.find({ date: { $gte: monthStart, $lte: monthEnd } }).sort({ date: 1 }),
    Leave.find({
      employee: req.user.id,
      status: "approved",
      startDate: { $lte: monthEnd },
      endDate: { $gte: monthStart }
    }).sort({ startDate: 1 })
  ]);

  if (!employee) {
    return res.status(404).json({ message: "User not found" });
  }

  const holidayMap = new Map(
    holidays.map((holiday) => [startOfDate(holiday.date).toISOString(), holiday])
  );

  const presentDateKeys = new Set(
    attendanceRecords
      .filter((record) => Boolean(record.checkIn))
      .map((record) => startOfDate(record.createdAt).toISOString())
  );

  const approvedLeaveDateKeys = new Set();
  approvedLeaves.forEach((leave) => {
    getDatesBetween(leave.startDate, leave.endDate).forEach((date) => {
      const day = startOfDate(date);
      const key = day.toISOString();
      const isWeekday = !isWeekend(day);
      const isHoliday = holidayMap.has(key);

      if (isWeekday && !isHoliday) {
        approvedLeaveDateKeys.add(key);
      }
    });
  });

  const monthlyCalendar = [];
  let workingDays = 0;
  let presentDays = 0;
  let leaveDays = 0;
  let absentDays = 0;

  getDatesBetween(monthStart, monthEnd).forEach((date) => {
    const day = startOfDate(date);
    const key = day.toISOString();
    const holiday = holidayMap.get(key);
    const weekend = isWeekend(day);
    const onLeave = approvedLeaveDateKeys.has(key);
    const present = presentDateKeys.has(key);
    const isWorkingDay = !weekend && !holiday;

    if (isWorkingDay) {
      workingDays += 1;

      if (present) {
        presentDays += 1;
      } else if (onLeave) {
        leaveDays += 1;
      } else if (day <= today) {
        absentDays += 1;
      }
    }

    monthlyCalendar.push({
      date: day,
      isWeekend: weekend,
      isHoliday: Boolean(holiday),
      holidayName: holiday?.name || "",
      isWorkingDay,
      isPresent: present,
      isOnLeave: onLeave,
      status: holiday
        ? "holiday"
        : weekend
          ? "weekend"
          : present
            ? "present"
            : onLeave
              ? "leave"
              : day <= today
                ? "absent"
                : "upcoming"
    });
  });

  const leaveBalance = normalizeLeaveBalance(employee.leaveBalance);
  const totalLeavesLeft = Object.values(leaveBalance)
    .reduce((sum, value) => sum + Number(value || 0), 0);

  res.json({
    user: {
      _id: employee._id,
      name: employee.name,
      department: employee.department,
      profileCompletion: getProfileCompletion(employee),
      leaveBalance,
      totalLeavesLeft
    },
    stats: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((task) => task.status === "completed").length,
      pendingTasks: tasks.filter((task) => task.status !== "completed").length,
      reportsSubmitted: reports.length,
      workingDays,
      presentDays,
      leaveDays,
      absentDays,
      totalLeavesLeft,
      holidayCount: holidays.length
    },
    todayAttendance: attendanceRecords.find((record) => isSameDay(record.createdAt, today)) || null,
    tasks: tasks.slice(0, 5),
    reports: reports.slice(0, 5),
    attendance: attendanceRecords.slice(0, 8),
    holidays,
    monthlyCalendar
  });
};

const startOfDay = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const startOfDate = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

const isSameDay = (dateA, dateB) =>
  startOfDate(dateA).getTime() === startOfDate(dateB).getTime();

const getDatesBetween = (start, end) => {
  const dates = [];
  const cursor = startOfDate(start);
  const finalDate = startOfDate(end);

  while (cursor <= finalDate) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};
