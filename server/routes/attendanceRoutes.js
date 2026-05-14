import express from "express";
import {
  enrollFace,
  getAttendance,
  getAttendanceAnalytics,
  getAttendanceSummary,
  markAttendance,
  markVoiceAttendance
} from "../controllers/attendanceController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.post("/face/enroll", enrollFace);
router.post("/voice", markVoiceAttendance);
router.post("/", markAttendance);
router.get("/", getAttendance);
router.get("/summary", getAttendanceSummary);
router.get("/analytics", getAttendanceAnalytics);

export default router;
