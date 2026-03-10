const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect routes - verify JWT
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user || req.user.status === "inactive") {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin access required" });
  }
};

// HR or Admin middleware
const hrOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "admin" || req.user.role === "hr")) {
    next();
  } else {
    res.status(403).json({ message: "HR or Admin access required" });
  }
};

module.exports = { protect, adminOnly, hrOrAdmin };
