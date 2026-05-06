import express from "express";
import {
  createPerformanceReview,
  getPerformanceReviews,
  updatePerformanceReview
} from "../controllers/performanceController.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getPerformanceReviews);
router.post("/", isManager, createPerformanceReview);
router.put("/:id", isManager, updatePerformanceReview);

export default router;
