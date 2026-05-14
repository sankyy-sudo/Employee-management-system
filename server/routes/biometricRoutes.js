import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import { isManager } from "../middleware/roleMiddleware.js";
import {
  registerDevice,
  updateDeviceStatus,
  getDevices,
  getDeviceDetails,
  updateDeviceConfig,
  assignEmployeesToDevice,
  recordBiometricAttendance,
  getDeviceAttendanceLogs
} from "../controllers/biometricController.js";

const router = express.Router();

// Register new device
router.post("/devices", verifyToken, isManager, registerDevice);

// Update device status (called by device service)
router.put("/devices/:deviceId/status", updateDeviceStatus);

// Get all devices
router.get("/devices", verifyToken, getDevices);

// Get device details
router.get("/devices/:deviceId", verifyToken, getDeviceDetails);

// Update device configuration
router.put("/devices/:deviceId", verifyToken, isManager, updateDeviceConfig);

// Assign employees to device
router.post("/devices/:deviceId/assign", verifyToken, isManager, assignEmployeesToDevice);

// Record biometric attendance
router.post("/attendance", verifyToken, recordBiometricAttendance);

// Get device attendance logs
router.get("/devices/:deviceId/logs", verifyToken, getDeviceAttendanceLogs);

export default router;
