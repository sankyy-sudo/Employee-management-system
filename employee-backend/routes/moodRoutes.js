import express from "express";
import { createMood, getMoodAnalytics, getMoodEntries } from "../controllers/moodController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getMoodEntries);
router.post("/", createMood);
router.get("/analytics", getMoodAnalytics);

export default router;
