import express from "express";
import {
  createFeedback,
  getFeedback,
  updateFeedback
} from "../controllers/feedbackController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getFeedback);
router.post("/", createFeedback);
router.put("/:id", updateFeedback);

export default router;
