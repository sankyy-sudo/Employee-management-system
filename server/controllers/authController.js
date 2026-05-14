import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serializeEmployee } from "../utils/employeeProfile.js";

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: String(user.role || "employee").toLowerCase(), email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { id: user._id, tokenVersion: user.updatedAt?.getTime?.() || Date.now() },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );

const persistRefreshToken = async (user) => {
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();
  return refreshToken;
};

export const register = async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email });

  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hash = await bcrypt.hash(req.body.password, 10);
  const normalizedRole = String(req.body.role || "employee").toLowerCase();
  const user = await User.create({ ...req.body, password: hash, lastSeenAt: new Date(), role: normalizedRole });
  const refreshToken = await persistRefreshToken(user);
  const safeUser = await User.findById(user._id).select("-password -refreshTokenHash");
  const serializedUser = serializeEmployee(safeUser);
  const token = signAccessToken(safeUser);

  res.status(201).json({ user: serializedUser, token, refreshToken });
};

export const login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) {
    return res.status(400).json({ message: "Wrong password" });
  }

  user.lastSeenAt = new Date();
  const refreshToken = await persistRefreshToken(user);
  const token = signAccessToken(user);

  const safeUser = user.toObject();
  delete safeUser.password;
  delete safeUser.refreshTokenHash;

  res.json({ user: serializeEmployee(safeUser), token, refreshToken });
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user?.refreshTokenHash) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);

  if (!matches) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }

  const token = signAccessToken(user);
  res.json({ token });
};

export const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { refreshTokenHash: "" });
  res.json({ message: "Logged out successfully" });
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { lastSeenAt: new Date() },
    { new: true }
  ).select("-password -refreshTokenHash");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(serializeEmployee(user));
};
