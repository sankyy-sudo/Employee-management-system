import express from "express";
import {
  getDashboardSummary,
  getEmployeeDashboardSummary
} from "../controllers/dashboardController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/summary", verifyToken, isManager, getDashboardSummary);
router.get("/employee-summary", verifyToken, getEmployeeDashboardSummary);

export default router;
