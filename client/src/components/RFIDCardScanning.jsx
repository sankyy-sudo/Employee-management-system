import { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { Loader2, Check, X, AlertCircle } from "lucide-react";

export default function RFIDCardScanning() {
  const [cardNumber, setCardNumber] = useState("");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastScan, setLastScan] = useState(null);
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();

    if (!cardNumber.trim()) {
      setError("Please scan a card");
      return;
    }

    try {
      setError("");
      setSuccess("");
      setScanning(true);
      setLoading(true);

      const { data } = await api.post("/rfid/scan", {
        cardNumber: cardNumber.trim(),
        action: "checkin"
      });

      setSuccess(
        `Attendance recorded! ${data.employee?.name} - ${data.attendance?.status}`
      );
      setLastScan({
        employee: data.employee,
        time: new Date().toLocaleTimeString(),
        status: data.attendance?.status
      });

      setCardNumber("");
      inputRef.current?.focus();

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to scan card";
      setError(errorMsg);
      setCardNumber("");
    } finally {
      setLoading(false);
      setScanning(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">RFID Card Scanning</h3>

        {/* Card Scan Input */}
        <form onSubmit={handleScan} className="mb-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="Scan card here..."
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !cardNumber.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing
                </>
              ) : (
                "Scan"
              )}
            </button>
          </div>
        </form>

        {/* Last Scan Info */}
        {lastScan && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Last Scan</p>
            <p className="font-semibold text-gray-900">{lastScan.employee?.name}</p>
            <p className="text-xs text-gray-500">
              {lastScan.time} • Status: {lastScan.status}
            </p>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 rounded-lg flex gap-2 items-start">
            <X size={20} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-600 rounded-lg flex gap-2 items-start">
            <Check size={20} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm">{success}</div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-semibold mb-2">Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Scan your RFID card at the reader</li>
            <li>Attendance will be automatically marked</li>
            <li>Status updates in real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
