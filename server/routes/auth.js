const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/auth/register - Register employee (Admin only)
router.post("/register", protect, adminOnly, async (req, res) => {
  try {
    const { employeeId, name, email, password, role, department, designation, skills, phone } = req.body;

    const userExists = await User.findOne({ $or: [{ email }, { employeeId }] });
    if (userExists) {
      return res.status(400).json({ message: "Employee already exists" });
    }

    const user = await User.create({
      employeeId,
      name,
      email,
      password,
      role: role || "employee",
      department: department || "",
      designation: designation || "",
      skills: skills || [],
      phone: phone || "",
    });

    res.status(201).json({
      _id: user._id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    const user = await User.findOne({ employeeId });
    if (!user) {
      return res.status(401).json({ message: "Invalid company ID or password" });
    }

    if (user.status === "inactive") {
      return res.status(403).json({ message: "Account has been deactivated. Contact HR." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid company ID or password" });
    }

    // Update online status
    user.isOnline = true;
    await user.save();

    res.json({
      _id: user._id,
      employeeId: user.employeeId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/logout
router.post("/logout", protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/auth/seed - Seed initial admin (only if no users exist)
router.post("/seed", async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: "Users already exist. Seed not allowed." });
    }

    const admin = await User.create({
      employeeId: "FAB001",
      name: "Admin User",
      email: "admin@fabchat.com",
      password: "admin123",
      role: "admin",
      department: "Administration",
      designation: "System Administrator",
      status: "active",
    });

    // Seed some demo employees
    const demoUsers = [
      { employeeId: "FAB002", name: "Priya Sharma", email: "priya@fabchat.com", password: "password123", role: "hr", department: "Human Resources", designation: "HR Manager", skills: ["Recruitment", "Training"], phone: "9876543210" },
      { employeeId: "FAB003", name: "Rahul Kumar", email: "rahul@fabchat.com", password: "password123", role: "employee", department: "Engineering", designation: "Senior Developer", skills: ["React", "Node.js", "MongoDB"], phone: "9876543211" },
      { employeeId: "FAB004", name: "Anita Singh", email: "anita@fabchat.com", password: "password123", role: "employee", department: "Engineering", designation: "Frontend Developer", skills: ["React", "CSS", "TypeScript"], phone: "9876543212", isOnWorkbench: true },
      { employeeId: "FAB005", name: "Vikram Patel", email: "vikram@fabchat.com", password: "password123", role: "employee", department: "Design", designation: "UI/UX Designer", skills: ["Figma", "Adobe XD", "CSS"], phone: "9876543213", isOnWorkbench: true },
      { employeeId: "FAB006", name: "Neha Gupta", email: "neha@fabchat.com", password: "password123", role: "employee", department: "QA", designation: "QA Engineer", skills: ["Selenium", "Jest", "Manual Testing"], phone: "9876543214" },
      { employeeId: "FAB007", name: "Arjun Reddy", email: "arjun@fabchat.com", password: "password123", role: "employee", department: "Engineering", designation: "Backend Developer", skills: ["Python", "Django", "PostgreSQL"], phone: "9876543215", isOnWorkbench: true },
      { employeeId: "FAB008", name: "Meera Das", email: "meera@fabchat.com", password: "password123", role: "employee", department: "Marketing", designation: "Marketing Lead", skills: ["SEO", "Content Strategy", "Analytics"], phone: "9876543216" },
    ];

    for (const u of demoUsers) {
      await User.create(u);
    }

    res.status(201).json({
      message: "Database seeded successfully",
      admin: { employeeId: admin.employeeId, password: "admin123" },
      note: "All demo users have password: password123",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
