export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json("Access denied");
  }
  next();
};

export const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  next();
};

export const isManager = allowRoles("admin", "hr");
