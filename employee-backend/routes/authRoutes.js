import express from "express";
import { register, login, getCurrentUser, logout, refresh } from "../controllers/authController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", verifyToken, logout);
router.get("/me", verifyToken, getCurrentUser);

export default router;
