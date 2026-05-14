import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";
import {
  issueCard,
  scanCard,
  getAllCards,
  getEmployeeCard,
  updateCardStatus,
  reportCardLost,
  replaceCard,
  getCardUsageHistory
} from "../controllers/rfidController.js";

const router = express.Router();

// Issue new card (admin only)
router.post("/cards", verifyToken, isManager, issueCard);

// Scan card and mark attendance
router.post("/scan", verifyToken, scanCard);

// Get all cards
router.get("/cards", verifyToken, getAllCards);
router.put("/cards/:cardId/status", verifyToken, isManager, updateCardStatus);

// Get employee's card
router.get("/cards/employee/:employeeId", verifyToken, getEmployeeCard);

// Get employee's own card
router.get("/my-card", verifyToken, (req, res, next) => {
  req.params.employeeId = req.user.id;
  getEmployeeCard(req, res);
});

// Report card as lost
router.put("/cards/:cardId/lost", verifyToken, reportCardLost);

// Replace lost card
router.post("/cards/:cardId/replace", verifyToken, isManager, replaceCard);

// Get card usage history
router.get("/cards/:cardId/history", verifyToken, getCardUsageHistory);

export default router;
