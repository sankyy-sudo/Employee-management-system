import express from "express";
import { getNotifications, markNotificationRead } from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", getNotifications);
router.patch("/:id/read", markNotificationRead);

export default router;
