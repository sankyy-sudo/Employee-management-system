import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";
import {
  uploadProfileImage,
  getProfileImage,
  deleteProfileImage,
  getAllEmployeeProfiles
} from "../controllers/profileController.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

// Profile image upload
router.post("/image", verifyToken, upload.single("image"), uploadProfileImage);

// Get profile image
router.get("/image/:userId", getProfileImage);

// Delete profile image
router.delete("/image", verifyToken, deleteProfileImage);

// Get all employee profiles (admin only)
router.get("/all", verifyToken, getAllEmployeeProfiles);

export default router;
