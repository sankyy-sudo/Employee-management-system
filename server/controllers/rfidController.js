import RFIDCard from "../models/RFIDCard.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import crypto from "crypto";
import { recordAttendance } from "../services/attendanceService.js";

/**
 * Generate unique card ID
 */
const generateCardId = () => {
  return `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

const generateCardNumber = () => {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
};

/**
 * Issue new RFID card to employee
 */
export const issueCard = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { employeeId, cardType = "proximity", expiryYears = 2, cardNumber: requestedCardNumber } = req.body;

    // Validate employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if employee already has active card
    const existingCard = await RFIDCard.findOne({
      employee: employeeId,
      status: "active"
    });

    if (existingCard) {
      return res.status(409).json({
        message: "Employee already has an active card",
        card: existingCard
      });
    }

    // Create new card
    const cardId = generateCardId();
    const cardNumber = requestedCardNumber?.trim() || generateCardNumber();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + expiryYears);

    const card = new RFIDCard({
      cardId,
      cardNumber,
      cardType,
      employee: employeeId,
      cardHolderName: employee.name,
      expiryDate,
      issueDate: new Date(),
      createdBy: req.user.id
    });

    await card.save();

    res.status(201).json({
      message: "RFID card issued successfully",
      card,
      printableInfo: {
        cardId,
        cardNumber,
        holderName: employee.name,
        department: employee.department,
        expiryDate: expiryDate.toLocaleDateString()
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
      ...(error.details || {})
    });
  }
};

/**
 * Scan RFID card and mark attendance
 */
export const scanCard = async (req, res) => {
  try {
    const { cardNumber, action = "checkin" } = req.body;

    if (!cardNumber) {
      return res.status(400).json({ message: "Card number is required" });
    }

    // Find card
    const card = await RFIDCard.findOne({ cardNumber })
      .populate("employee", "name email department designation")
      .populate("lastScannedDevice", "deviceName location");

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Validate card status
    if (card.status === "lost") {
      return res.status(403).json({ message: "This card has been reported as lost" });
    }

    if (card.status === "suspended") {
      return res.status(403).json({ message: "This card has been suspended" });
    }

    if (card.status === "expired") {
      return res.status(403).json({ message: "This card has expired" });
    }

    if (card.status !== "active") {
      return res.status(403).json({ message: "This card is not active" });
    }

    // Check card expiry
    if (card.expiryDate && new Date() > card.expiryDate) {
      card.status = "expired";
      await card.save();
      return res.status(403).json({ message: "This card has expired" });
    }

    const employeeId = card.employee._id;

    // Check for duplicate scan
    const delayWindow = 300000; // 5 minutes
    const lastAttendance = await Attendance.findOne({
      userId: employeeId,
      method: "rfid_card",
      createdAt: { $gte: new Date(Date.now() - delayWindow) }
    });

    if (lastAttendance && action === "checkin") {
      return res.status(409).json({
        message: "Duplicate scan detected. Please wait before scanning again.",
        timeRemaining: Math.ceil((lastAttendance.createdAt.getTime() + delayWindow - Date.now()) / 1000),
        lastAttendance
      });
    }

    const attendance = await recordAttendance({
      req,
      userId: employeeId,
      action,
      method: "rfid_scan",
      rfidData: {
        cardId: card.cardId,
        cardNumber,
        cardType: card.cardType
      }
    });

    // Update card last used time
    card.lastUsed = new Date();
    card.usageCount = (card.usageCount || 0) + 1;
    await card.save();

    res.status(201).json({
      message: `Attendance ${action} recorded successfully via RFID card`,
      attendance,
      employee: card.employee,
      card: {
        cardId: card.cardId,
        lastUsed: card.lastUsed
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
      ...(error.details || {})
    });
  }
};

/**
 * Get all cards (admin only)
 */
export const getAllCards = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { status, employeeId } = req.query;
    const query = {};

    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;

    const cards = await RFIDCard.find(query)
      .populate("employee", "name email employeeId department")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateCardStatus = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { cardId } = req.params;
    const { status, notes } = req.body;
    const allowedStatuses = ["active", "inactive", "lost", "suspended", "expired"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid card status" });
    }

    const card = await RFIDCard.findByIdAndUpdate(
      cardId,
      {
        status,
        ...(notes !== undefined && { notes }),
        ...(status === "lost" && { reportedLostDate: new Date() })
      },
      { new: true }
    ).populate("employee", "name email employeeId department");

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    res.json({ message: "Card status updated", card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get employee's card
 */
export const getEmployeeCard = async (req, res) => {
  try {
    const employeeId = req.user.role === "employee" ? req.user.id : req.params.employeeId;

    const card = await RFIDCard.findOne({ employee: employeeId })
      .populate("employee", "name email department")
      .populate("createdBy", "name");

    if (!card) {
      return res.status(404).json({ message: "No card found for this employee" });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Report card as lost
 */
export const reportCardLost = async (req, res) => {
  try {
    const { cardId } = req.params;

    const card = await RFIDCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    // Only employee or admin can report
    if (String(req.user.id) !== String(card.employee) && !["admin", "hr"].includes(String(req.user.role || "").toLowerCase())) {
      return res.status(403).json({ message: "Access denied" });
    }

    card.status = "lost";
    card.reportedLostDate = new Date();
    await card.save();

    res.json({
      message: "Card reported as lost",
      card
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Replace lost card
 */
export const replaceCard = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { cardId } = req.params;
    const oldCard = await RFIDCard.findById(cardId);

    if (!oldCard) {
      return res.status(404).json({ message: "Card not found" });
    }

    if (oldCard.status !== "lost") {
      return res.status(400).json({ message: "Only lost cards can be replaced" });
    }

    // Create new card
    const newCardId = generateCardId();
    const newCardNumber = generateCardNumber();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    const newCard = new RFIDCard({
      cardId: newCardId,
      cardNumber: newCardNumber,
      cardType: oldCard.cardType,
      employee: oldCard.employee,
      cardHolderName: oldCard.cardHolderName,
      expiryDate,
      createdBy: req.user.id,
      replacementCardId: oldCard._id
    });

    await newCard.save();

    // Update old card reference
    oldCard.replacementCardId = newCard._id;
    await oldCard.save();

    res.json({
      message: "Replacement card issued",
      oldCard,
      newCard
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get card usage history
 */
export const getCardUsageHistory = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { startDate, endDate } = req.query;

    const card = await RFIDCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const query = {
      "rfidData.cardId": card.cardId
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const history = await Attendance.find(query)
      .populate("userId", "name email department")
      .sort({ createdAt: -1 });

    res.json({
      card,
      usageHistory: history,
      totalUsage: history.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  issueCard,
  scanCard,
  getAllCards,
  getEmployeeCard,
  updateCardStatus,
  reportCardLost,
  replaceCard,
  getCardUsageHistory
};
