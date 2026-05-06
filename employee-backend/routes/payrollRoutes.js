import express from "express";
import {
  createPayroll,
  downloadPayslip,
  getPayrolls,
  updatePayroll
} from "../controllers/payrollController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getPayrolls);
router.get("/:id/payslip", downloadPayslip);
router.post("/", isManager, createPayroll);
router.put("/:id", isManager, updatePayroll);

export default router;
