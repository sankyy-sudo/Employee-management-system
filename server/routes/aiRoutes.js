import express from "express";
import { getCareerGrowthPlan, predictEmployeeSalary } from "../controllers/aiController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.post("/predict-salary", predictEmployeeSalary);
router.get("/career-growth", getCareerGrowthPlan);

export default router;
