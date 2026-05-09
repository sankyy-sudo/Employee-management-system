export const isAdmin = (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();

  if (role !== "admin") {
    return res.status(403).json({ message: "Access Denied" });
  }
  next();
};

export const allowRoles = (...roles) => (req, res, next) => {
  const role = String(req.user?.role || "").trim().toLowerCase();
  const allowedRoles = roles.map((item) => String(item).trim().toLowerCase());

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ message: "Access Denied" });
  }

  next();
};

export const isManager = allowRoles("admin", "hr");
