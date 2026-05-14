import { useState, useEffect } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Calendar, Clock, User, MapPin, Smartphone, Fingerprint, CreditCard } from "lucide-react";

const METHOD_ICONS = {
  face_recognition: Smartphone,
  biometric: Fingerprint,
  rfid_card: CreditCard,
  manual: User,
  mobile_app: Smartphone
};

const STATUS_COLORS = {
  Present: "bg-green-100 text-green-800",
  Late: "bg-yellow-100 text-yellow-800",
  "Half-day": "bg-orange-100 text-orange-800",
  Absent: "bg-red-100 text-red-800",
  "On Leave": "bg-blue-100 text-blue-800",
  Remote: "bg-purple-100 text-purple-800",
  "Work From Home": "bg-indigo-100 text-indigo-800"
};

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/attendance");
      setAttendanceRecords(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError("Failed to load attendance history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    if (filterMethod !== "all" && record.method !== filterMethod) return false;
    if (filterStatus !== "all" && record.status !== filterStatus) return false;
    return true;
  });

  const formatTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const getMethodLabel = (method) => {
    const labels = {
      face_recognition: "Face Recognition",
      biometric: "Biometric",
      rfid_card: "RFID Card",
      manual: "Manual",
      mobile_app: "Mobile App"
    };
    return labels[method] || method;
  };

  const MethodIcon = (method) => {
    const Icon = METHOD_ICONS[method] || User;
    return <Icon size={16} />;
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Attendance History</h3>
          <button
            onClick={fetchAttendance}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendance Method
            </label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Methods</option>
              <option value="face_recognition">Face Recognition</option>
              <option value="biometric">Biometric</option>
              <option value="rfid_card">RFID Card</option>
              <option value="manual">Manual</option>
              <option value="mobile_app">Mobile App</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half-day">Half-day</option>
              <option value="Absent">Absent</option>
              <option value="On Leave">On Leave</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Records Table */}
        {!loading && (
          <div className="overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No attendance records found
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Check In</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Check Out</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Method</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const workHours = record.workMinutes ? (record.workMinutes / 60).toFixed(2) : "-";
                    return (
                      <tr key={record._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm flex items-center gap-2 text-gray-700">
                          <Calendar size={16} className="text-gray-400" />
                          {formatDate(record.date || record.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm flex items-center gap-2 text-gray-700">
                          <Clock size={16} className="text-gray-400" />
                          {formatTime(record.checkIn)}
                        </td>
                        <td className="px-4 py-3 text-sm flex items-center gap-2 text-gray-700">
                          <Clock size={16} className="text-gray-400" />
                          {formatTime(record.checkOut)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[record.status] || STATUS_COLORS.Present}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            {MethodIcon(record.method)}
                            <span className="text-gray-700">{getMethodLabel(record.method)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                          {workHours}h
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {!loading && filteredRecords.length > 0 && (
          <div className="mt-6 grid grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredRecords.filter(r => r.status === "Present").length}
              </p>
              <p className="text-xs text-gray-500">Present Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {filteredRecords.filter(r => r.status === "Late").length}
              </p>
              <p className="text-xs text-gray-500">Late Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {filteredRecords.filter(r => r.status === "Absent").length}
              </p>
              <p className="text-xs text-gray-500">Absent Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(filteredRecords.reduce((sum, r) => sum + (r.workMinutes || 0), 0) / 60).toFixed(1)}h
              </p>
              <p className="text-xs text-gray-500">Total Hours</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
