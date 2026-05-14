import { useCallback, useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coffee,
  Download,
  Edit3,
  Filter,
  Gauge,
  History,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  UserCheck,
  UserMinus,
  Users,
  Zap
} from "lucide-react";
import Layout from "../components/Layout";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card, { SectionHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import Skeleton from "../components/ui/Skeleton";
import SmartAttendanceSystem from "../components/SmartAttendanceSystem";
import api from "../lib/api";
import getSocket from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatTime } from "../utils/format";
import { statusTone } from "../utils/statusTone";

const shiftStartHour = 10;
const targetHours = 8;
const chartGrid = "rgba(148, 163, 184, 0.18)";
const chartAxis = "#64748B";

const pageMotion = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut", staggerChildren: 0.04 } }
};

const itemMotion = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } }
};

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = ["admin", "hr"].includes(String(user?.role || "").toLowerCase());
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => normalizeDate(new Date()).toDateString());
  const [manualUserId, setManualUserId] = useState("");
  const [approvedCorrections, setApprovedCorrections] = useState(() => new Set());
  const [tick, setTick] = useState(() => Date.now());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [socketConnected, setSocketConnected] = useState(false);
  const [activityFeed, setActivityFeed] = useState([]);
  const [liveLeaveEmployeeIds, setLiveLeaveEmployeeIds] = useState(() => new Set());

  const loadAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const requests = [api.get("/attendance"), api.get("/attendance/summary")];
    if (isAdmin) requests.push(api.get("/employees"));

    try {
      const [historyRes, summaryRes, employeesRes] = await Promise.all(requests);
      setHistory(historyRes.data || []);
      setSummary(summaryRes.data || null);
      if (employeesRes) {
        setEmployees(employeesRes.data || []);
        setManualUserId((current) => current || employeesRes.data?.[0]?._id || "");
      }
      setLastRefresh(new Date());
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAttendance();
    const refresh = setInterval(() => loadAttendance(true), 30000);
    return () => clearInterval(refresh);
  }, [loadAttendance]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setSocketConnected(true);
      if (user?._id || user?.id) socket.emit("join", user._id || user.id);
    };

    const handleDisconnect = () => setSocketConnected(false);

    const handleAttendanceUpdate = (event) => {
      const record = event?.record;

      if (record?._id) {
        setHistory((current) => upsertAttendanceRecord(current, record));
      }

      if (event?.type === "on_leave" && (event.employee?._id || event.employee?.id)) {
        setLiveLeaveEmployeeIds((current) => new Set(current).add(String(event.employee._id || event.employee.id)));
      }

      setActivityFeed((current) => [buildActivityEvent(event), ...current].slice(0, 8));
      setLastRefresh(new Date());
      loadAttendance(true);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("attendance:updated", handleAttendanceUpdate);

    if (!socket.connected) socket.connect();
    else handleConnect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("attendance:updated", handleAttendanceUpdate);
    };
  }, [loadAttendance, user]);

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const employeeMap = useMemo(() => new Map(employees.map((employee) => [String(employee._id), employee])), [employees]);
  const todayRecords = useMemo(() => history.filter((record) => isToday(record.createdAt || record.checkIn)), [history]);
  const currentUserRecords = useMemo(() => history.filter((record) => {
    if (isAdmin) return String(getRecordEmployeeId(record)) === String(user?._id || user?.id);
    return true;
  }), [history, isAdmin, user]);
  const today = currentUserRecords.find((record) => isToday(record.createdAt || record.checkIn)) || currentUserRecords[0];
  const activeTodayRecords = useMemo(() => todayRecords.filter((record) => record.checkIn && !record.checkOut), [todayRecords]);
  const completedTodayRecords = useMemo(() => todayRecords.filter((record) => record.checkIn && record.checkOut), [todayRecords]);
  const clockedIn = Boolean(today?.checkIn && !today?.checkOut);
  const workingHours = getWorkingDuration(today, tick);
  const adminLiveHours = getAverageActiveDuration(activeTodayRecords, tick);
  const dashboardWorkingHours = isAdmin ? adminLiveHours : workingHours;
  const workProgress = Math.min(100, (durationToHours(workingHours) / targetHours) * 100);
  const dashboardProgress = Math.min(100, (durationToHours(dashboardWorkingHours) / targetHours) * 100);
  const breakTime = estimateBreakTime(workingHours);

  const totalEmployees = isAdmin ? employees.length : 1;
  const presentEmployees = isAdmin ? uniqueByEmployee(todayRecords.filter((record) => record.checkIn)).length : Number(Boolean(today?.checkIn));
  const checkedInEmployees = isAdmin ? uniqueByEmployee(activeTodayRecords) : Number(Boolean(today?.checkIn && !today?.checkOut));
  const checkedOutEmployees = isAdmin ? uniqueByEmployee(completedTodayRecords) : Number(Boolean(today?.checkIn && today?.checkOut));
  const absentEmployees = Math.max(totalEmployees - presentEmployees, 0);
  const lateRecords = history.filter((record) => isLateRecord(record));
  const lateToday = todayRecords.filter((record) => isLateRecord(record)).length;
  const employeesOnLeave = isAdmin ? estimateLeaveCount(totalEmployees, todayRecords.length) : 0;
  const averageHours = getAverageHours(history);
  const attendancePercentage = totalEmployees ? Math.round((presentEmployees / totalEmployees) * 100) : getAttendanceRate(summary, history);
  const productivityScore = Math.min(98, Math.max(55, attendancePercentage + Number(averageHours) * 3 - lateToday * 4));
  const remainingHours = Math.max(0, targetHours - durationToHours(dashboardWorkingHours));
  const overtime = Math.max(0, durationToHours(dashboardWorkingHours) - targetHours);
  const overtimeEmployees = isAdmin ? todayRecords.filter((record) => durationToHours(getWorkingDuration(record, tick)) > targetHours).length : Number(overtime > 0);

  const departments = useMemo(() => {
    const values = employees.map((employee) => employee.department).filter(Boolean);
    return Array.from(new Set(values));
  }, [employees]);

  const filteredHistory = useMemo(() => {
    const term = query.trim().toLowerCase();
    return history.filter((record) => {
      const employee = getRecordEmployee(record, employeeMap, user);
      const normalizedStatus = getAttendanceStatus(record).toLowerCase();
      const matchesStatus = statusFilter === "all" || normalizedStatus.includes(statusFilter);
      const matchesDepartment = departmentFilter === "all" || String(employee.department || "").toLowerCase() === departmentFilter.toLowerCase();
      const matchesShift = shiftFilter === "all" || (shiftFilter === "late" ? isLateRecord(record) : !isLateRecord(record));
      const matchesDate = !dateFilter || normalizeDate(record.createdAt || record.checkIn).toISOString().slice(0, 10) === dateFilter;
      const searchable = [
        employee.name,
        employee.employeeId,
        employee.department,
        employee.designation,
        formatDate(record.createdAt),
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        getAttendanceStatus(record),
        getWorkMode(record)
      ].join(" ").toLowerCase();
      return matchesStatus && matchesDepartment && matchesShift && matchesDate && (!term || searchable.includes(term));
    });
  }, [history, query, statusFilter, departmentFilter, shiftFilter, dateFilter, employeeMap, user]);

  const selectedDateRecords = useMemo(() => {
    return history.filter((record) => normalizeDate(record.createdAt || record.checkIn).toDateString() === selectedDate);
  }, [history, selectedDate]);

  const calendarDays = useMemo(() => buildCalendar(history, selectedDate), [history, selectedDate]);
  const workHourTrend = useMemo(() => buildWorkHourTrend(history), [history]);
  const attendanceTrend = useMemo(() => buildAttendanceTrend(history), [history]);
  const departmentTrend = useMemo(() => buildDepartmentTrend(history, employeeMap), [history, employeeMap]);
  const statusBreakdown = useMemo(() => buildStatusBreakdown(history), [history]);
  const absentEmployeeRows = useMemo(() => {
    const presentIds = new Set(todayRecords.map((record) => String(getRecordEmployeeId(record))));
    return employees
      .filter((employee) => !presentIds.has(String(employee._id)))
      .map((employee, index) => ({
        ...employee,
        absenceStatus: liveLeaveEmployeeIds.has(String(employee._id)) || index < employeesOnLeave ? "On Leave" : "Not Checked In",
        shiftTiming: `${String(shiftStartHour).padStart(2, "0")}:00 - ${shiftStartHour + targetHours}:00`
      }));
  }, [employees, employeesOnLeave, liveLeaveEmployeeIds, todayRecords]);

  const markAttendance = async (action, userId) => {
    setSubmitting(true);
    setMessage("");
    try {
      const payload = { action };
      if (userId) payload.userId = userId;
      await api.post("/attendance", payload);
      await loadAttendance(true);
      setMessage(action === "checkin" ? "Clocked in successfully. Attendance is live." : "Clocked out successfully. Work session saved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Attendance action failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const approveCorrection = (record) => {
    setApprovedCorrections((current) => new Set(current).add(record._id || record.createdAt));
    setMessage("Attendance correction marked as approved in the review queue.");
  };

  const exportRows = () => {
    downloadCsv("attendance-report.csv", filteredHistory.map((record) => {
      const employee = getRecordEmployee(record, employeeMap, user);
      return {
        employee: employee.name,
        employeeId: employee.employeeId,
        department: employee.department,
        date: formatDate(record.createdAt),
        clockIn: formatTime(record.checkIn),
        clockOut: formatTime(record.checkOut),
        workingHours: getWorkingDuration(record),
        status: getAttendanceStatus(record),
        mode: getWorkMode(record)
      };
    }));
  };

  return (
    <Layout>
      <Motion.div variants={pageMotion} initial="hidden" animate="visible" className="mx-auto max-w-[1700px] space-y-6">
        <Motion.section variants={itemMotion} className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
          <div className="absolute right-10 top-6 h-36 w-36 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="absolute bottom-6 left-1/2 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)]">
            <div className="bg-gradient-to-r from-slate-950 via-blue-700 to-emerald-600 p-5 text-white sm:p-7 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue" className="bg-white/15 text-white ring-white/20">Attendance Command Center</Badge>
                <Badge tone={clockedIn ? "emerald" : "slate"} className={clockedIn ? "bg-emerald-300/20 text-emerald-50 ring-emerald-200/20" : "bg-white/10 text-white ring-white/20"}>
                  {clockedIn ? "Live session" : "Ready for shift"}
                </Badge>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/15">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
                  Updated {formatTime(lastRefresh)}
                </span>
              </div>

              <div className="mt-6 max-w-4xl">
                <p className="text-sm font-semibold text-blue-100">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
                  Real-time attendance, work hours, and shift health in one place.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
                  Monitor live presence, clock activity, late entries, productivity signals, calendar heatmaps, and attendance exceptions with an enterprise-grade workflow.
                </p>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <HeroPill icon={Timer} label={isAdmin ? "Avg live timer" : "Live work timer"} value={dashboardWorkingHours} />
                <HeroPill icon={Users} label={isAdmin ? "Present now" : "Current status"} value={isAdmin ? presentEmployees : getAttendanceStatus(today)} />
                <HeroPill icon={AlertTriangle} label="Late signals" value={lateToday} />
              </div>
            </div>

            <div className="border-t border-white/15 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-950/70 sm:p-7 xl:border-l xl:border-t-0">
              {isAdmin ? (
                <AdminRealtimePanel
                  activeCount={checkedInEmployees}
                  completedCount={checkedOutEmployees}
                  absentCount={absentEmployees}
                  lateCount={lateToday}
                  liveHours={adminLiveHours}
                  progress={dashboardProgress}
                  connected={socketConnected}
                />
              ) : (
                <ClockPanel
                  today={today}
                  clockedIn={clockedIn}
                  workingHours={workingHours}
                  progress={workProgress}
                  submitting={submitting}
                  onClockIn={() => markAttendance("checkin")}
                  onClockOut={() => markAttendance("checkout")}
                />
              )}
            </div>
          </div>
        </Motion.section>

        {message && (
          <Motion.div variants={itemMotion} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
            {message}
          </Motion.div>
        )}

        <SmartAttendanceSystem onAttendanceMarked={() => loadAttendance(true)} />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40" />)}
          </div>
        ) : (
          <Motion.section variants={itemMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <AnalyticsKpi icon={Users} title="Total Employees" value={totalEmployees} detail="Active workforce scope" trend={`${attendancePercentage}% live`} tone="blue" data={attendanceTrend.map((item) => item.score)} />
            <AnalyticsKpi icon={UserCheck} title="Present Employees" value={presentEmployees} detail="Employees marked present today" trend="+8%" tone="emerald" data={attendanceTrend.map((item) => item.present)} />
            <AnalyticsKpi icon={UserMinus} title="Absent Employees" value={absentEmployees} detail="Not checked in or absent today" trend="-2%" tone="rose" data={attendanceTrend.map((item) => item.absent)} />
            <AnalyticsKpi icon={LogIn} title="Employees Checked In" value={checkedInEmployees} detail="Currently working sessions" trend="Live" tone="emerald" data={attendanceTrend.map((item) => item.present - item.absent)} />
            <AnalyticsKpi icon={LogOut} title="Employees Checked Out" value={checkedOutEmployees} detail="Completed work sessions" trend={`${averageHours}h avg`} tone="slate" data={workHourTrend.map((item) => item.hours)} />
            <AnalyticsKpi icon={AlertTriangle} title="Late Entries" value={lateToday} detail="Today shift violations" trend={lateToday ? "Review" : "Clear"} tone={lateToday ? "amber" : "emerald"} data={attendanceTrend.map((item) => item.late)} />
          </Motion.section>
        )}

        <Motion.section variants={itemMotion} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader
              eyebrow="Live status"
              title={isAdmin ? "Organization Working Hours Monitor" : "Working Hours Tracker"}
              description={isAdmin ? "Active sessions, completed shifts, overtime exposure, and live organization work-hour health." : "Current session, break balance, overtime, remaining shift time, and productivity state."}
              actions={<Button onClick={() => loadAttendance(true)} variant="outline" size="sm" icon={RefreshCw}>Refresh</Button>}
            />
            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{isAdmin ? "Workforce status" : "Attendance status"}</p>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{isAdmin ? `${checkedInEmployees} actively working` : getAttendanceStatus(today)}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{isAdmin ? `${checkedOutEmployees} completed sessions and ${absentEmployees} absent signals today.` : clockedIn ? "Active work session is being tracked." : "No active working session."}</p>
                  </div>
                  <span className={`relative flex h-12 w-12 items-center justify-center rounded-2xl ${(isAdmin ? checkedInEmployees > 0 : clockedIn) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                    {(isAdmin ? checkedInEmployees > 0 : clockedIn) && <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400" />}
                    <Activity size={20} />
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <StatusLine label={isAdmin ? "Active sessions" : "Clock in"} value={isAdmin ? checkedInEmployees : formatTime(today?.checkIn)} />
                  <StatusLine label={isAdmin ? "Completed sessions" : "Clock out"} value={isAdmin ? checkedOutEmployees : formatTime(today?.checkOut)} />
                  <StatusLine label={isAdmin ? "Avg live timer" : "Last activity"} value={isAdmin ? adminLiveHours : formatTime(today?.updatedAt || today?.checkOut || today?.checkIn)} />
                  <StatusLine label={isAdmin ? "Attendance health" : "Work mode"} value={isAdmin ? `${attendancePercentage}% present` : getWorkMode(today)} />
                  <StatusLine label="Shift" value={`${String(shiftStartHour).padStart(2, "0")}:00 - ${shiftStartHour + targetHours}:00`} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <CircularTracker title={isAdmin ? "Avg Workday" : "Workday"} value={isAdmin ? dashboardProgress : workProgress} center={dashboardWorkingHours} detail={`${remainingHours.toFixed(1)}h remaining`} tone="#2563EB" />
                <CircularTracker title="Productivity" value={productivityScore} center={`${productivityScore}%`} detail="Session quality" tone="#10B981" />
                <TrackerTile icon={isAdmin ? LogOut : Coffee} label={isAdmin ? "Checked Out" : "Break Time"} value={isAdmin ? checkedOutEmployees : breakTime} detail={isAdmin ? "Completed today" : "Estimated balance"} />
                <TrackerTile icon={Zap} label={isAdmin ? "Overtime Employees" : "Overtime"} value={isAdmin ? overtimeEmployees : `${overtime.toFixed(1)}h`} detail="Beyond shift target" />
              </div>
            </div>
          </Card>

          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader
              eyebrow="Realtime"
              title="Live Attendance Status"
              description={isAdmin ? "Who is present, absent, late, remote, or ready for correction review." : "Your current attendance and recent session health."}
              actions={<LiveSyncBadge connected={socketConnected} />}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <LiveStatusTile icon={UserCheck} label="Present" value={presentEmployees} tone="emerald" />
              <LiveStatusTile icon={UserMinus} label="Absent" value={absentEmployees} tone="rose" />
              <LiveStatusTile icon={LogIn} label="Checked In" value={checkedInEmployees} tone="blue" />
              <LiveStatusTile icon={LogOut} label="Checked Out" value={checkedOutEmployees} tone="slate" />
            </div>
            <div className="mt-5 space-y-3">
              {todayRecords.slice(0, 5).map((record) => (
                <LiveRow key={record._id || record.createdAt} record={record} employee={getRecordEmployee(record, employeeMap, user)} />
              ))}
              {!todayRecords.length && <EmptyState icon={Activity} title="No live attendance yet" description="Clock-in activity will appear here as employees start their shift." />}
            </div>
            <LiveActivityFeed events={activityFeed} />
          </Card>
        </Motion.section>

        {isAdmin && (
          <Motion.section variants={itemMotion}>
            <AbsentEmployeesPanel employees={absentEmployeeRows} employeesOnLeave={employeesOnLeave} />
          </Motion.section>
        )}

        {isAdmin && (
          <Motion.section variants={itemMotion}>
            <AdminControls
              employees={employees}
              manualUserId={manualUserId}
              setManualUserId={setManualUserId}
              submitting={submitting}
              onMark={(action) => markAttendance(action, manualUserId)}
              lateRecords={lateRecords}
              approvedCorrections={approvedCorrections}
              onApprove={approveCorrection}
            />
          </Motion.section>
        )}

        <Motion.section variants={itemMotion} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader
              eyebrow="Calendar"
              title="Attendance Calendar"
              description="Clickable month heatmap for present, absent, leave, holiday, and late entry states."
              actions={<Badge tone="blue">{new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Badge>}
            />
            <AttendanceCalendar days={calendarDays} onSelect={(day) => setSelectedDate(normalizeDate(day.date).toDateString())} />
            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Legend color="bg-emerald-500" label="Present" />
              <Legend color="bg-amber-500" label="Late" />
              <Legend color="bg-rose-500" label="Absent" />
              <Legend color="bg-blue-500" label="Leave" />
              <Legend color="bg-slate-300 dark:bg-slate-700" label="Holiday/weekend" />
            </div>
          </Card>

          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader eyebrow="Selected day" title="Daily Attendance Detail" description={formatDate(new Date(selectedDate))} />
            <div className="mt-5 space-y-3">
              {selectedDateRecords.slice(0, 6).map((record) => (
                <DailyDetail key={record._id || record.createdAt} record={record} employee={getRecordEmployee(record, employeeMap, user)} />
              ))}
              {!selectedDateRecords.length && <EmptyState icon={CalendarDays} title="No records for this date" description="Select another day or wait for new attendance activity." />}
            </div>
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion}>
          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader
              eyebrow="History"
              title="Attendance History"
              description="Search, filter, sort visually, and export attendance records across employee, department, status, date, and shift signals."
              actions={<Button onClick={exportRows} variant="outline" size="sm" icon={Download}>Export CSV</Button>}
            />
            <AttendanceFilters
              query={query}
              setQuery={setQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              shiftFilter={shiftFilter}
              setShiftFilter={setShiftFilter}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              departments={departments}
              isAdmin={isAdmin}
            />
            <AttendanceTable rows={filteredHistory} employeeMap={employeeMap} user={user} isAdmin={isAdmin} onExport={exportRows} />
          </Card>
        </Motion.section>

        <Motion.section variants={itemMotion} className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader eyebrow="Alerts" title="Late Entry Alerts" description="Late arrivals, missed attendance, irregularities, and shift violations." actions={<Badge tone={lateRecords.length ? "amber" : "emerald"}>{lateRecords.length} flagged</Badge>} />
            <div className="mt-5 space-y-3">
              {lateRecords.slice(0, 5).map((record) => (
                <LateAlert
                  key={record._id || record.createdAt}
                  record={record}
                  employee={getRecordEmployee(record, employeeMap, user)}
                  approved={approvedCorrections.has(record._id || record.createdAt)}
                  onApprove={() => approveCorrection(record)}
                  isAdmin={isAdmin}
                />
              ))}
              {!lateRecords.length && <EmptyState icon={CheckCircle2} title="No late entries" description="Punctuality is clear for the current data set." />}
            </div>
          </Card>

          <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
            <SectionHeader eyebrow="Analytics" title="Attendance Analytics" description="Weekly trends, monthly report indicators, department comparison, productivity, and working-hour analysis." />
            <div className="mt-5 grid min-w-0 gap-5 lg:grid-cols-2">
              <ChartPanel title="Weekly attendance trend">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <AreaChart data={attendanceTrend}>
                    <defs>
                      <linearGradient id="attendanceFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.28} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="score" stroke="#2563EB" strokeWidth={3} fill="url(#attendanceFill)" />
                    <Line type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Working hour analysis">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={workHourTrend}>
                    <CartesianGrid stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="hours" fill="#10B981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Department attendance">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={departmentTrend}>
                    <CartesianGrid stroke={chartGrid} vertical={false} />
                    <XAxis dataKey="department" tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: chartAxis, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="present" fill="#2563EB" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="late" fill="#F59E0B" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel title="Status mix">
                <div className="grid h-full min-w-0 grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-center gap-3">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie data={statusBreakdown} innerRadius={42} outerRadius={70} dataKey="value" paddingAngle={4}>
                        {statusBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {statusBreakdown.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />{item.name}
                        </span>
                        <span className="font-semibold text-slate-950 dark:text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartPanel>
            </div>
          </Card>
        </Motion.section>
      </Motion.div>
    </Layout>
  );
}

function AdminRealtimePanel({ activeCount, completedCount, absentCount, lateCount, liveHours, progress, connected }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Admin live command center</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{activeCount} working now</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Average active timer: {liveHours}</p>
        </div>
        <LiveSyncBadge connected={connected} />
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Average shift progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <Motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.45, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <StatusTile label="Checked In" value={activeCount} />
        <StatusTile label="Checked Out" value={completedCount} />
        <StatusTile label="Absent Today" value={absentCount} />
        <StatusTile label="Late Entries" value={lateCount} />
      </div>
    </div>
  );
}

function ClockPanel({ today, clockedIn, workingHours, progress, submitting, onClockIn, onClockOut }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Clock In / Clock Out</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{workingHours}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{clockedIn ? "Live timer is running" : "Start your work session"}</p>
        </div>
        <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${clockedIn ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"}`}>
          {clockedIn && <span className="absolute h-3 w-3 animate-ping rounded-full bg-emerald-400" />}
          <Timer size={22} />
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Daily shift progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <Motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }} transition={{ duration: 0.45, ease: "easeOut" }} className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button disabled={submitting || clockedIn} onClick={onClockIn} icon={LogIn} className="h-14 bg-gradient-to-r from-blue-600 to-blue-700 shadow-blue-500/20">
          Clock In
        </Button>
        <Button disabled={submitting || !clockedIn} onClick={onClockOut} variant="secondary" icon={LogOut} className="h-14">
          Clock Out
        </Button>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <StatusTile label="Started" value={formatTime(today?.checkIn)} />
        <StatusTile label="Ended" value={formatTime(today?.checkOut)} />
      </div>
    </div>
  );
}

function AdminControls({ employees, manualUserId, setManualUserId, submitting, onMark, lateRecords, approvedCorrections, onApprove }) {
  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader
        eyebrow="Admin controls"
        title="Attendance Operations"
        description="Mark attendance manually, review correction requests, and resolve shift exceptions without leaving the dashboard."
        actions={<Badge tone="blue">{employees.length} employees</Badge>}
      />
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="font-semibold text-slate-950 dark:text-white">Manual attendance</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use for HR-approved corrections or missed punch recovery.</p>
          <label className="mt-4 block">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Employee</span>
            <select value={manualUserId} onChange={(event) => setManualUserId(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
              {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} / {employee.department || "Unassigned"}</option>)}
            </select>
          </label>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button disabled={submitting || !manualUserId} onClick={() => onMark("checkin")} icon={LogIn}>Mark In</Button>
            <Button disabled={submitting || !manualUserId} onClick={() => onMark("checkout")} variant="secondary" icon={LogOut}>Mark Out</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950 dark:text-white">Correction approval queue</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Late and irregular entries surfaced for quick HR review.</p>
            </div>
            <Badge tone={lateRecords.length ? "amber" : "emerald"}>{lateRecords.length} open</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {lateRecords.slice(0, 4).map((record) => (
              <div key={record._id || record.createdAt} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{formatDate(record.createdAt)}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Clock-in {formatTime(record.checkIn)}</p>
                  </div>
                  <Badge tone={approvedCorrections.has(record._id || record.createdAt) ? "emerald" : "amber"}>
                    {approvedCorrections.has(record._id || record.createdAt) ? "Approved" : "Pending"}
                  </Badge>
                </div>
                <Button onClick={() => onApprove(record)} disabled={approvedCorrections.has(record._id || record.createdAt)} variant="outline" size="sm" icon={ShieldCheck} className="mt-3 w-full">
                  Approve Correction
                </Button>
              </div>
            ))}
            {!lateRecords.length && <EmptyState icon={CheckCircle2} title="No corrections pending" description="Shift exceptions will appear here." />}
          </div>
        </div>
      </div>
    </Card>
  );
}

function AbsentEmployeesPanel({ employees, employeesOnLeave }) {
  const notCheckedIn = employees.filter((employee) => employee.absenceStatus === "Not Checked In").length;
  return (
    <Card className="border-white/70 bg-white/85 p-5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85 sm:p-6">
      <SectionHeader
        eyebrow="Absence queue"
        title="Absent, Not Checked In, and On Leave"
        description="A focused today view for employees who have not started shift activity or are currently marked as leave overlap."
        actions={
          <>
            <Badge tone="rose">{employees.length} absent today</Badge>
            <Badge tone="amber">{notCheckedIn} not checked in</Badge>
            <Badge tone="blue">{employeesOnLeave} on leave</Badge>
          </>
        }
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {employees.slice(0, 6).map((employee) => (
          <Motion.article
            key={employee._id || employee.employeeId}
            whileHover={{ y: -2 }}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                  {initials(employee.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name || "Employee"}</p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">{employee.department || "Unassigned"} / {employee.employeeId || "EMS"}</p>
                </div>
              </div>
              <Badge tone={employee.absenceStatus === "On Leave" ? "blue" : "rose"}>{employee.absenceStatus}</Badge>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <StatusTile label="Shift Timing" value={employee.shiftTiming} />
              <StatusTile label="Leave Status" value={employee.absenceStatus === "On Leave" ? "Approved" : "No leave"} />
            </div>
          </Motion.article>
        ))}
        {!employees.length && <div className="md:col-span-2 xl:col-span-3"><EmptyState icon={CheckCircle2} title="No absent employees" description="Every active employee has a recorded check-in for today." /></div>}
      </div>
    </Card>
  );
}

function AttendanceFilters({ query, setQuery, statusFilter, setStatusFilter, departmentFilter, setDepartmentFilter, shiftFilter, setShiftFilter, dateFilter, setDateFilter, departments, isAdmin }) {
  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(140px,0.5fr))]">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Search size={16} className="text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAdmin ? "Search employee, ID, department, status" : "Search date, status, or time"} className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none dark:text-slate-100" aria-label="Search attendance history" />
      </div>
      <FilterSelect icon={Filter} label="Status" value={statusFilter} onChange={setStatusFilter} options={[["all", "All status"], ["checked in", "Checked in"], ["checked out", "Checked out"], ["late", "Late"], ["absent", "Absent"], ["on leave", "On leave"], ["remote", "Remote"]]} />
      <FilterSelect icon={BriefcaseBusiness} label="Department" value={departmentFilter} onChange={setDepartmentFilter} options={[["all", "All departments"], ...departments.map((department) => [department, department])]} disabled={!isAdmin} />
      <FilterSelect icon={Clock3} label="Shift" value={shiftFilter} onChange={setShiftFilter} options={[["all", "All shifts"], ["ontime", "On time"], ["late", "Late"]]} />
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CalendarDays size={16} className="text-slate-400" />
        <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} type="date" className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-100" aria-label="Filter by date" />
      </label>
    </div>
  );
}

function FilterSelect({ icon, value, onChange, options, disabled = false }) {
  const IconComponent = icon;
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <IconComponent size={16} className="text-slate-400" />
      <select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none disabled:opacity-50 dark:text-slate-100">
        {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
      </select>
    </label>
  );
}

function AttendanceTable({ rows, employeeMap, user, isAdmin }) {
  const headers = isAdmin
    ? ["Photo", "Employee Name", "Employee ID", "Department", "Attendance Status", "Check In Time", "Check Out Time", "Total Working Hours", "Shift Status", "Late Entry Status", "Actions"]
    : ["Date", "Check In Time", "Check Out Time", "Total Working Hours", "Attendance Status", "Shift Status", "Actions"];

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-slate-500 backdrop-blur dark:bg-slate-950/95 dark:text-slate-400">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {headers.map((label) => (
                <th key={label} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((record, index) => {
              const employee = getRecordEmployee(record, employeeMap, user);
              return (
                <tr key={record._id || index} className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-800/50">
                  {isAdmin && (
                    <>
                      <td className="px-4 py-4">
                        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                          {record.checkIn && !record.checkOut && <span className="absolute right-0 top-0 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />}
                          {initials(employee.name)}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-950 dark:text-white">{employee.name || "Employee"}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{employee.employeeId || "EMS"}</td>
                      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{employee.department || "Unassigned"}</td>
                    </>
                  )}
                  {!isAdmin && <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-100">{formatDate(record.createdAt)}</td>}
                  <td className="px-4 py-4"><Badge tone={statusTone(getAttendanceStatus(record))}>{getAttendanceStatus(record)}</Badge></td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatTime(record.checkIn)}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatTime(record.checkOut)}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{getWorkingDuration(record)}</td>
                  <td className="px-4 py-4"><Badge tone={isLateRecord(record) ? "amber" : "emerald"}>{getShiftStatus(record)}</Badge></td>
                  {isAdmin && <td className="px-4 py-4"><Badge tone={isLateRecord(record) ? "amber" : "slate"}>{isLateRecord(record) ? "Late" : "On Time"}</Badge></td>}
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" icon={History}>View</Button>
                      {isAdmin && <Button variant="outline" size="sm" icon={Edit3}>Edit</Button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <div className="p-4"><EmptyState icon={CalendarDays} title="No attendance records" description="Try changing search, filters, or date range." /></div>}
    </div>
  );
}

function AttendanceCalendar({ days, onSelect }) {
  return (
    <>
      <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => <CalendarCell key={day.key} day={day} onSelect={onSelect} />)}
      </div>
    </>
  );
}

function CalendarCell({ day, onSelect }) {
  if (day.blank) return <div className="aspect-square" />;
  const colors = {
    present: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    late: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    absent: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
    leave: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300",
    holiday: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400",
    working: "border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
  };
  return (
    <Motion.button type="button" whileHover={{ y: -2 }} onClick={() => onSelect(day)} className={`aspect-square rounded-2xl border p-2 text-left shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500 ${day.selected ? "ring-2 ring-blue-500" : ""} ${colors[day.status] || colors.working}`} title={`${formatDate(day.date)} - ${day.status}`}>
      <span className="block text-sm font-bold">{new Date(day.date).getDate()}</span>
      <span className="mt-1 hidden text-[11px] font-medium capitalize sm:block">{day.status}</span>
    </Motion.button>
  );
}

function AnalyticsKpi({ icon, title, value, detail, trend, tone, data }) {
  const Icon = icon;
  const colors = {
    blue: "from-blue-600/12 to-sky-500/5 text-blue-700 dark:text-blue-300",
    emerald: "from-emerald-600/12 to-teal-500/5 text-emerald-700 dark:text-emerald-300",
    amber: "from-amber-500/14 to-orange-500/5 text-amber-700 dark:text-amber-300",
    rose: "from-rose-500/14 to-red-500/5 text-rose-700 dark:text-rose-300",
    slate: "from-slate-500/12 to-slate-400/5 text-slate-700 dark:text-slate-300"
  };
  return (
    <Motion.article whileHover={{ y: -3 }} className={`overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br ${colors[tone] || colors.blue} bg-white/85 p-4 shadow-soft backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85`}>
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-slate-950/80"><Icon size={19} /></span>
        <Badge tone={tone === "rose" ? "rose" : tone === "amber" ? "amber" : "emerald"}>{trend}</Badge>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
      <div className="mt-3 h-12 overflow-hidden rounded-xl bg-white/70 dark:bg-slate-950/70">
        <Sparkline data={data} />
      </div>
    </Motion.article>
  );
}

function Sparkline({ data = [] }) {
  const source = data.length ? data : [2, 4, 3, 6, 5, 7, 6];
  const values = source.map((item) => Number(item || 0));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = (index / Math.max(values.length - 1, 1)) * 100;
    const y = 42 - (value / max) * 34;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 100 48" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={`0,48 ${points} 100,48`} fill="rgba(37,99,235,0.14)" stroke="none" />
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CircularTracker({ title, value, center, detail, tone }) {
  const data = [{ name: title, value: Math.max(0, Math.min(100, value)), fill: tone }];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <div className="relative mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <RadialBarChart innerRadius="72%" outerRadius="96%" data={data} startAngle={90} endAngle={-270}>
            <RadialBar dataKey="value" cornerRadius={16} background={{ fill: "rgba(148, 163, 184, 0.16)" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-slate-950 dark:text-white">{center}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }) {
  return (
    <div className="h-72 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="mb-3 font-semibold text-slate-950 dark:text-white">{title}</p>
      <div className="h-[calc(100%-2rem)] min-w-0">{children}</div>
    </div>
  );
}

function HeroPill({ icon, label, value }) {
  const IconComponent = icon;
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
      <IconComponent size={18} className="text-blue-100" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function LiveStatusTile({ icon, label, value, tone }) {
  const IconComponent = icon;
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[tone] || colors.blue}`}><IconComponent size={17} /></span>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function LiveSyncBadge({ connected }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${connected ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20" : "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20"}`}>
      <span className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.9)]" : "bg-amber-500"}`} />
      {connected ? "Live sync" : "Reconnecting"}
    </span>
  );
}

function LiveActivityFeed({ events }) {
  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-950 dark:text-white">Live Activity Feed</p>
        <Badge tone="emerald">Realtime</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {events.map((event) => (
          <Motion.div
            key={event.id}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="flex items-center gap-3 rounded-2xl bg-white px-3 py-3 shadow-sm dark:bg-slate-900"
          >
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${event.tone === "rose" ? "bg-rose-500" : event.tone === "amber" ? "bg-amber-500" : event.tone === "blue" ? "bg-blue-500" : "bg-emerald-500"}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{event.message}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatTime(event.timestamp)}</p>
            </div>
          </Motion.div>
        ))}
        {!events.length && (
          <div className="rounded-2xl bg-white px-3 py-4 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            Live clock-in, clock-out, absence, remote, and leave updates will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

function LiveRow({ record, employee }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
          {initials(employee.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-white">{employee.name || "Employee"}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{formatTime(record.checkIn)} / {employee.department || getWorkMode(record)}</p>
        </div>
      </div>
      <Badge tone={isLateRecord(record) ? "amber" : "emerald"}>{isLateRecord(record) ? "Late" : "On time"}</Badge>
    </div>
  );
}

function DailyDetail({ record, employee }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">{employee.name || "Attendance record"}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatTime(record.checkIn)} - {formatTime(record.checkOut)} / {getWorkingDuration(record)}</p>
        </div>
        <Badge tone={statusTone(getAttendanceStatus(record))}>{getAttendanceStatus(record)}</Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
        <StatusTile label="Mode" value={getWorkMode(record)} />
        <StatusTile label="Late" value={isLateRecord(record) ? "Yes" : "No" } />
        <StatusTile label="Verified" value={record.faceVerified ? "Yes" : "Manual"} />
      </div>
    </div>
  );
}

function LateAlert({ record, employee, approved, onApprove, isAdmin }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 shadow-sm dark:bg-slate-900 dark:text-amber-300">
          <AlertTriangle size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-950 dark:text-white">{employee.name || formatDate(record.createdAt)}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Clocked in at {formatTime(record.checkIn)}, after expected shift start.</p>
            </div>
            <Badge tone={approved ? "emerald" : "amber"}>{approved ? "Approved" : "Review"}</Badge>
          </div>
          {isAdmin && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={onApprove} disabled={approved} variant="outline" size="sm" icon={ShieldCheck}>Approve Correction</Button>
              <Button variant="ghost" size="sm" icon={Edit3}>Edit Record</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrackerTile({ icon, label, value, detail }) {
  const IconComponent = icon;
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"><IconComponent size={17} /></span>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

function StatusLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="truncate font-semibold text-slate-950 dark:text-white">{value || "--"}</span>
    </div>
  );
}

function StatusTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-950 dark:text-white">{value || "--"}</p>
    </div>
  );
}

function Legend({ color, label }) {
  return <span className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lift dark:border-slate-800 dark:bg-slate-900">
      {label && <p className="mb-1 font-semibold text-slate-950 dark:text-white">{label}</p>}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="text-slate-600 dark:text-slate-300">
          <span className="font-semibold capitalize" style={{ color: item.color || item.payload?.color }}>{item.name || item.dataKey}</span>: {item.value}
        </p>
      ))}
    </div>
  );
}

function getRecordEmployeeId(record) {
  if (typeof record?.userId === "object") return record.userId?._id;
  return record?.userId || record?.employee?._id || record?.employee;
}

function getRecordEmployee(record, employeeMap, fallbackUser) {
  if (record?.userId && typeof record.userId === "object") return record.userId;
  const id = getRecordEmployeeId(record);
  return employeeMap.get(String(id)) || fallbackUser || {};
}

function upsertAttendanceRecord(records = [], nextRecord) {
  const recordId = String(nextRecord?._id || "");
  if (!recordId) return records;

  const exists = records.some((record) => String(record._id) === recordId);
  const nextRecords = exists
    ? records.map((record) => (String(record._id) === recordId ? { ...record, ...nextRecord } : record))
    : [nextRecord, ...records];

  return nextRecords.sort((a, b) => new Date(b.createdAt || b.checkIn || 0) - new Date(a.createdAt || a.checkIn || 0));
}

function buildActivityEvent(event = {}) {
  const type = event.type || "updated";
  const employee = event.employee || event.record?.userId || {};
  const timestamp = event.timestamp || new Date().toISOString();
  const fallbackName = employee.name || "Employee";
  const tones = {
    checked_in: "emerald",
    checked_out: "blue",
    absent: "rose",
    on_leave: "amber",
    remote: "blue"
  };

  return {
    id: `${type}-${event.record?._id || event.leave?._id || timestamp}-${Math.random().toString(36).slice(2)}`,
    message: event.message || `${fallbackName} attendance updated`,
    timestamp,
    tone: tones[type] || "emerald"
  };
}

function getAttendanceStatus(record) {
  if (!record) return "Not marked";
  const status = String(record.status || "").toLowerCase();
  if (status.includes("leave")) return "On Leave";
  if (status.includes("remote")) return "Remote";
  if (status.includes("absent")) return "Absent";
  if (isLateRecord(record)) return "Late";
  if (record.status) return record.status;
  if (record.checkIn && record.checkOut) return "Checked Out";
  if (record.checkIn) return "Checked In";
  return "Absent";
}

function getShiftStatus(record) {
  if (!record?.checkIn) return "Not Started";
  if (isLateRecord(record)) return "Late Shift";
  if (record.checkIn && record.checkOut) return "Completed";
  return "Active Shift";
}

function getWorkMode(record) {
  if (!record) return "Office";
  if (String(record.status || "").toLowerCase().includes("remote")) return "Remote";
  if (record.location?.latitude || record.location?.longitude) return "Field";
  if (record.faceVerified) return "Office";
  return "Manual";
}

function getWorkingDuration(record, now = Date.now()) {
  if (!record?.checkIn) return "00:00";
  const end = record.checkOut ? new Date(record.checkOut).getTime() : now;
  const diff = end - new Date(record.checkIn).getTime();
  if (diff <= 0) return "00:00";
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function durationToHours(value) {
  const [hours = 0, minutes = 0] = String(value).split(":").map(Number);
  return hours + minutes / 60;
}

function estimateBreakTime(duration) {
  const hours = durationToHours(duration);
  if (hours < 4) return "00:15";
  if (hours < 7) return "00:35";
  return "00:50";
}

function isLateRecord(record) {
  if (!record?.checkIn) return false;
  const checkIn = new Date(record.checkIn);
  return checkIn.getHours() > shiftStartHour || (checkIn.getHours() === shiftStartHour && checkIn.getMinutes() > 15) || String(record.status || "").toLowerCase().includes("late");
}

function isToday(value) {
  if (!value) return false;
  return normalizeDate(value).toDateString() === normalizeDate(new Date()).toDateString();
}

function normalizeDate(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function uniqueByEmployee(records = []) {
  return new Set(records.map((record) => String(getRecordEmployeeId(record) || record._id))).size;
}

function getAverageHours(records = []) {
  const completed = records.filter((record) => record.checkIn && record.checkOut);
  if (!completed.length) return "0.0";
  const total = completed.reduce((sum, record) => sum + durationToHours(getWorkingDuration(record)), 0);
  return (total / completed.length).toFixed(1);
}

function getAverageActiveDuration(records = [], now = Date.now()) {
  if (!records.length) return "00:00";
  const totalMinutes = records.reduce((sum, record) => {
    const duration = getWorkingDuration(record, now);
    return sum + Math.round(durationToHours(duration) * 60);
  }, 0);
  const averageMinutes = Math.floor(totalMinutes / records.length);
  const hours = Math.floor(averageMinutes / 60);
  const minutes = averageMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getAttendanceRate(summary, history) {
  const presentDays = Number(summary?.stats?.presentDays || 0);
  const totalRecords = Number(summary?.stats?.totalRecords || history.length || 0);
  return totalRecords ? Math.round((presentDays / totalRecords) * 100) : 0;
}

function estimateLeaveCount(totalEmployees, todayRecords) {
  if (!totalEmployees) return 0;
  return Math.max(0, Math.min(totalEmployees, Math.round((totalEmployees - todayRecords) * 0.18)));
}

function buildCalendar(records = [], selectedDate) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const recordMap = new Map();
  records.forEach((record) => {
    const key = normalizeDate(record.createdAt || record.checkIn).toDateString();
    const current = recordMap.get(key) || [];
    current.push(record);
    recordMap.set(key, current);
  });
  const days = [];

  for (let i = 0; i < monthStart.getDay(); i += 1) {
    days.push({ key: `blank-${i}`, blank: true });
  }

  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const keyDate = normalizeDate(cursor);
    const dayRecords = recordMap.get(keyDate.toDateString()) || [];
    const weekend = keyDate.getDay() === 0 || keyDate.getDay() === 6;
    let status = "working";
    if (dayRecords.length) status = dayRecords.some(isLateRecord) ? "late" : "present";
    else if (weekend) status = "holiday";
    else if (keyDate < normalizeDate(new Date())) status = "absent";

    days.push({
      key: keyDate.toISOString(),
      date: new Date(keyDate),
      status,
      selected: keyDate.toDateString() === selectedDate
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function buildWorkHourTrend(records = []) {
  const source = records.slice(0, 10).reverse();
  if (!source.length) return fallbackSeries("hours", 10, 7);
  return source.map((record) => ({
    label: new Date(record.createdAt || record.checkIn).toLocaleDateString(undefined, { day: "2-digit" }),
    hours: Number(durationToHours(getWorkingDuration(record)).toFixed(1))
  }));
}

function buildAttendanceTrend(records = []) {
  const grouped = new Map();
  records.forEach((record) => {
    const key = normalizeDate(record.createdAt || record.checkIn).toISOString();
    const row = grouped.get(key) || { date: new Date(record.createdAt || record.checkIn), present: 0, late: 0, absent: 0, score: 0 };
    if (isLateRecord(record)) row.late += 1;
    if (record.checkIn) row.present += 1;
    if (String(record.status || "").toLowerCase().includes("absent")) row.absent += 1;
    grouped.set(key, row);
  });
  const rows = Array.from(grouped.values()).sort((a, b) => a.date - b.date).slice(-10).map((row) => ({
    label: row.date.toLocaleDateString(undefined, { weekday: "short" }),
    present: row.present,
    late: row.late,
    absent: row.absent,
    score: Math.max(20, Math.min(100, row.present * 18 - row.late * 8 - row.absent * 10 + 70))
  }));
  return rows.length ? rows : fallbackAttendanceSeries();
}

function buildDepartmentTrend(records = [], employeeMap) {
  const grouped = new Map();
  records.forEach((record) => {
    const employee = getRecordEmployee(record, employeeMap, {});
    const department = employee.department || "Unassigned";
    const row = grouped.get(department) || { department, present: 0, late: 0 };
    if (record.checkIn) row.present += 1;
    if (isLateRecord(record)) row.late += 1;
    grouped.set(department, row);
  });
  const rows = Array.from(grouped.values()).slice(0, 6);
  return rows.length ? rows : [
    { department: "Product", present: 8, late: 1 },
    { department: "HR", present: 4, late: 0 },
    { department: "Sales", present: 6, late: 2 }
  ];
}

function buildStatusBreakdown(records = []) {
  const counts = records.reduce((acc, record) => {
    if (isLateRecord(record)) acc.Late += 1;
    else if (String(record.status || "").toLowerCase().includes("absent")) acc.Absent += 1;
    else if (record.checkOut) acc.Completed += 1;
    else if (record.checkIn) acc.Active += 1;
    return acc;
  }, { Active: 0, Completed: 0, Late: 0, Absent: 0 });
  const data = [
    { name: "Active", value: counts.Active, color: "#2563EB" },
    { name: "Completed", value: counts.Completed, color: "#10B981" },
    { name: "Late", value: counts.Late, color: "#F59E0B" },
    { name: "Absent", value: counts.Absent, color: "#EF4444" }
  ];
  return data.some((item) => item.value) ? data : data.map((item, index) => ({ ...item, value: index === 1 ? 1 : 0 }));
}

function fallbackSeries(key, length, value) {
  return Array.from({ length }, (_, index) => ({
    label: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Now", "Next", "Live"][index] || `D${index + 1}`,
    [key]: Math.max(0, value - Math.abs(index - 5) * 0.4)
  }));
}

function fallbackAttendanceSeries() {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, index) => ({
    label,
    present: 8 + index,
    late: index % 3,
    absent: index % 2,
    score: 82 + index
  }));
}

function initials(name = "Employee") {
  return String(name).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "EM";
}

function downloadCsv(filename, rows) {
  const source = rows?.length ? rows : [];
  const headers = Object.keys(source[0] || { message: "No records" });
  const csv = [
    headers.join(","),
    ...source.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(","))
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
