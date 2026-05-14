import User from "../models/User.js";
import fs from "fs";
import path from "path";

/**
 * Upload profile image for employee
 */
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "User not found" });
    }

    // Delete old profile image if exists
    if (user.profileImage && fs.existsSync(user.profileImage)) {
      try {
        fs.unlinkSync(user.profileImage);
      } catch (err) {
        console.error("Error deleting old profile image:", err);
      }
    }

    // Save image path relative to project root
    const imagePath = path.relative(process.cwd(), req.file.path);
    user.profileImage = imagePath;
    await user.save();

    res.json({
      message: "Profile image uploaded successfully",
      profileImage: imagePath,
      url: `/api/uploads/profile/${path.basename(imagePath)}`
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get employee profile image
 */
export const getProfileImage = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("profileImage name");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profileImage || !fs.existsSync(user.profileImage)) {
      return res.status(404).json({ message: "Profile image not found" });
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(path.resolve(user.profileImage));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Delete profile image
 */
export const deleteProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.profileImage) {
      return res.status(404).json({ message: "No profile image found" });
    }

    // Delete file from disk
    if (fs.existsSync(user.profileImage)) {
      try {
        fs.unlinkSync(user.profileImage);
      } catch (err) {
        console.error("Error deleting file:", err);
      }
    }

    user.profileImage = null;
    await user.save();

    res.json({ message: "Profile image deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get all employees with profile images (admin only)
 */
export const getAllEmployeeProfiles = async (req, res) => {
  try {
    const role = String(req.user.role || "").toLowerCase();
    if (!["admin", "hr"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const employees = await User.find({ role: "employee" })
      .select("_id name email department designation profileImage status")
      .sort({ name: 1 });

    const employeesWithUrls = employees.map(emp => ({
      ...emp.toObject(),
      profileImageUrl: emp.profileImage ? `/api/uploads/profile/${emp._id}` : null
    }));

    res.json(employeesWithUrls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export default {
  uploadProfileImage,
  getProfileImage,
  deleteProfileImage,
  getAllEmployeeProfiles
};
