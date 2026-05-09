import mongoose from "mongoose";

export const requireDatabase = (req, res, next) => {
  if (req.path === "/api/health") {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database is not connected. Check MONGO_URI and MongoDB network access."
    });
  }

  next();
};

export const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: Object.values(err.errors).map((error) => error.message)
    });
  }

  if (err.code === 11000) {
    return res.status(409).json({
      message: "Duplicate value",
      fields: Object.keys(err.keyPattern || err.keyValue || {})
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource id" });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);

  res.status(statusCode).json({
    message: statusCode === 500 ? "Internal server error" : err.message
  });
};
