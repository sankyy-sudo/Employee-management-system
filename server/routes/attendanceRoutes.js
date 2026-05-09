import express from "express";
import {
  enrollFace,
  getAttendance,
  getAttendanceSummary,
  markAttendance
} from "../controllers/attendanceController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.post("/face/enroll", enrollFace);
router.post("/", markAttendance);
router.get("/", getAttendance);
router.get("/summary", getAttendanceSummary);

export default router;
