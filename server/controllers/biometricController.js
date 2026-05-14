import BiometricDevice from "../models/BiometricDevice.js";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import { recordAttendance } from "../services/attendanceService.js";

/**
 * Register new biometric device
 */
export const registerDevice = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { deviceId, deviceName, deviceType, manufacturer, model, serialNumber, location } = req.body;

    // Validate required fields
    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({ message: "Missing required fields: deviceId, deviceName, deviceType" });
    }

    // Check if device already registered
    const existing = await BiometricDevice.findOne({ deviceId });
    if (existing) {
      return res.status(409).json({ message: "Device with this ID already registered" });
    }

    const device = new BiometricDevice({
      deviceId,
      deviceName,
      deviceType,
      manufacturer,
      model,
      serialNumber,
      location: location || {},
      createdBy: req.user.id
    });

    await device.save();
    res.status(201).json({
      message: "Biometric device registered successfully",
      device
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
      ...(error.details || {})
    });
  }
};

/**
 * Update device connection status (called by device service)
 */
export const updateDeviceStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status, isOnline, ipAddress, macAddress } = req.body;

    const device = await BiometricDevice.findOneAndUpdate(
      { deviceId },
      {
        status: status || "active",
        isOnline: isOnline !== undefined ? isOnline : true,
        lastConnected: new Date(),
        ...(ipAddress && { ipAddress }),
        ...(macAddress && { macAddress })
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json({
      message: "Device status updated",
      device
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message,
      ...(error.details || {})
    });
  }
};

/**
 * Get all registered devices
 */
export const getDevices = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const devices = await BiometricDevice.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get single device details
 */
export const getDeviceDetails = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await BiometricDevice.findOne({ deviceId })
      .populate("createdBy", "name email")
      .populate("assignedEmployees", "name email department");

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json(device);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update device configuration
 */
export const updateDeviceConfig = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { deviceId } = req.params;
    const { deviceName, location, attendanceDelay, verificationThreshold, maxRetries, notes } = req.body;

    const device = await BiometricDevice.findOneAndUpdate(
      { deviceId },
      {
        ...(deviceName && { deviceName }),
        ...(location && { location }),
        ...(attendanceDelay !== undefined && { attendanceDelay }),
        ...(verificationThreshold !== undefined && { verificationThreshold }),
        ...(maxRetries !== undefined && { maxRetries }),
        ...(notes !== undefined && { notes })
      },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json({
      message: "Device configuration updated",
      device
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Assign employees to device
 */
export const assignEmployeesToDevice = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { deviceId } = req.params;
    const { employeeIds } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ message: "Please provide employee IDs array" });
    }

    // Validate all employees exist
    const employees = await User.find({ _id: { $in: employeeIds }, role: "employee" });
    if (employees.length !== employeeIds.length) {
      return res.status(404).json({ message: "Some employees not found" });
    }

    const device = await BiometricDevice.findOneAndUpdate(
      { deviceId },
      { assignedEmployees: employeeIds },
      { new: true }
    ).populate("assignedEmployees", "name email department");

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json({
      message: "Employees assigned to device",
      device
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Record biometric attendance
 */
export const recordBiometricAttendance = async (req, res) => {
  try {
    const { deviceId, employeeId, scanQuality, action = "checkin" } = req.body;

    // Validate device
    const device = await BiometricDevice.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Validate employee is assigned to this device
    if (!device.assignedEmployees.map(String).includes(String(employeeId))) {
      return res.status(403).json({ message: "Employee not assigned to this device" });
    }

    // Validate employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const attendance = await recordAttendance({
      req,
      userId: employeeId,
      action,
      method: "biometric",
      biometricData: {
        deviceId,
        scanQuality: scanQuality || 100
      },
      duplicateIntervalMs: device.attendanceDelay || 300000
    });

    res.status(201).json({
      message: `Attendance ${action} recorded successfully`,
      attendance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get device attendance logs
 */
export const getDeviceAttendanceLogs = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { deviceId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { 
      method: "biometric",
      "biometricData.deviceId": deviceId
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await Attendance.find(query)
      .populate("userId", "name email employeeId department")
      .sort({ createdAt: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  registerDevice,
  updateDeviceStatus,
  getDevices,
  getDeviceDetails,
  updateDeviceConfig,
  assignEmployeesToDevice,
  recordBiometricAttendance,
  getDeviceAttendanceLogs
};
