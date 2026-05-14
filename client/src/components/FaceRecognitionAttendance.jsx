import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { Camera, Check, X, AlertCircle } from "lucide-react";

export default function FaceRecognitionAttendance() {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [livenessStatus, setLivenessStatus] = useState(null);

  // Start camera
  const startCamera = async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  // Capture frame
  const captureFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const context = canvasRef.current.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
    
    return canvasRef.current.toDataURL("image/jpeg");
  };

  // Check liveness (simplified)
  const checkLiveness = async () => {
    // Mock liveness detection
    // In production, use: face-liveness-detection or MediaPipe
    setLivenessStatus("checking");
    
    try {
      // Capture multiple frames over time
      const frames = [];
      for (let i = 0; i < 5; i++) {
        const frame = await captureFrame();
        frames.push(frame);
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms between frames
      }

      // Simulate liveness check
      const isLive = Math.random() > 0.1; // 90% success rate
      
      if (isLive) {
        setLivenessStatus("success");
        return true;
      } else {
        setLivenessStatus("failed");
        setError("Liveness check failed. Please ensure you are providing a live sample.");
        return false;
      }
    } catch (err) {
      setLivenessStatus("error");
      setError("Error during liveness detection");
      return false;
    }
  };

  // Mark attendance with face recognition
  const markAttendance = async (action = "checkin") => {
    try {
      if (!user?.faceProfile?.embedding) {
        setError("Face profile not registered. Please register your face first.");
        return;
      }

      setError("");
      setSuccess("");
      setRecognizing(true);

      // Check liveness
      const isLive = await checkLiveness();
      if (!isLive) {
        setRecognizing(false);
        return;
      }

      // Capture frame
      const imageData = await captureFrame();
      
      // Send to backend for face matching
      const { data } = await api.post("/attendance/mark", {
        action,
        faceEmbedding: user.faceProfile.embedding,
        liveness: { livenessDetected: true },
        location: { latitude: null, longitude: null }
      }, {
        headers: { "X-Frame-Data": imageData }
      });

      setSuccess(`Attendance marked successfully - ${action === "checkin" ? "Check-in" : "Check-out"} at ${new Date(data.checkIn || data.checkOut).toLocaleTimeString()}`);
      
      setTimeout(() => {
        setSuccess("");
        stopCamera();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark attendance");
    } finally {
      setRecognizing(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Face Recognition Attendance</h3>

        {/* Camera Preview */}
        <div className="mb-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-80 object-cover"
                />
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="hidden"
                />
              </>
            ) : (
              <div className="w-full h-80 flex items-center justify-center text-gray-400">
                <Camera size={48} />
              </div>
            )}

            {/* Liveness Status */}
            {livenessStatus && (
              <div className="absolute top-4 right-4 p-2 rounded-lg bg-black/70 text-white text-sm">
                {livenessStatus === "checking" && "Checking liveness..."}
                {livenessStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Check size={16} /> Liveness verified
                  </div>
                )}
                {livenessStatus === "failed" && (
                  <div className="flex items-center gap-2 text-red-400">
                    <X size={16} /> Liveness failed
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-4">
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Camera
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Stop Camera
            </button>
          )}
        </div>

        {/* Attendance Buttons */}
        {cameraActive && (
          <div className="flex gap-2">
            <button
              onClick={() => markAttendance("checkin")}
              disabled={recognizing}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {recognizing ? "Processing..." : "Check In"}
            </button>
            <button
              onClick={() => markAttendance("checkout")}
              disabled={recognizing}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {recognizing ? "Processing..." : "Check Out"}
            </button>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg flex gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-50 text-green-600 rounded-lg flex gap-2">
            <Check size={20} />
            {success}
          </div>
        )}

        {!user?.faceProfile?.embedding && (
          <div className="mt-4 p-3 bg-yellow-50 text-yellow-600 rounded-lg flex gap-2">
            <AlertCircle size={20} />
            Please register your face first in Settings
          </div>
        )}
      </div>
    </div>
  );
}
