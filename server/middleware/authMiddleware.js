import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id role email name");

    if (!user) {
      return res.status(401).json({ message: "Invalid token user" });
    }

    req.user = {
      ...decoded,
      id: String(user._id),
      role: user.role,
      email: user.email,
      name: user.name
    };

    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
