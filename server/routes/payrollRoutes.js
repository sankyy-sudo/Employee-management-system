import express from "express";
import {
  createPayroll,
  downloadPayslip,
  getMyPayrolls,
  getPayrolls,
  updatePayroll
} from "../controllers/payrollController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isAdmin } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/me", getMyPayrolls);
router.use(isAdmin);
router.get("/", getPayrolls);
router.get("/:id/payslip", downloadPayslip);
router.post("/", createPayroll);
router.put("/:id", updatePayroll);

export default router;
