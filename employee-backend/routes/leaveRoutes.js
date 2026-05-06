import express from "express";
import {
  applyLeave,
  getLeaveBalance,
  getLeaveRequests,
  updateLeaveStatus
} from "../controllers/leaveController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getLeaveRequests);
router.get("/balance", getLeaveBalance);
router.post("/", applyLeave);
router.patch("/:id/status", isManager, updateLeaveStatus);

export default router;
