import express from "express";
import {
  createReport,
  deleteReport,
  getReports,
  getMonthlyReport,
  updateReport
} from "../controllers/reportController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/monthly", getMonthlyReport);
router.get("/", getReports);
router.post("/", createReport);
router.put("/:id", updateReport);
router.delete("/:id", deleteReport);

export default router;
