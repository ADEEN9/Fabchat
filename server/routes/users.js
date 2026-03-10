const express = require("express");
const User = require("../models/User");
const { protect, adminOnly, hrOrAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /api/users - Get all employees (searchable)
router.get("/", protect, async (req, res) => {
  try {
    const { search, department, role } = req.query;
    let query = { status: "active" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { designation: { $regex: search, $options: "i" } },
      ];
    }

    if (department) query.department = department;
    if (role) query.role = role;

    const users = await User.find(query)
      .select("-password")
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "Employee not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/:id - Update user (Admin/HR or self)
router.put("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Employee not found" });

    // Only admin/hr can change role or status
    const isAdminOrHR = req.user.role === "admin" || req.user.role === "hr";
    const isSelf = req.user._id.toString() === req.params.id;

    if (!isAdminOrHR && !isSelf) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { name, department, designation, skills, phone, avatar, role, status, isOnWorkbench, currentProject, availability } = req.body;

    if (name) user.name = name;
    if (department) user.department = department;
    if (designation) user.designation = designation;
    if (skills) user.skills = skills;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    // Only admin can change these
    if (isAdminOrHR) {
      if (role) user.role = role;
      if (status) user.status = status;
      if (typeof isOnWorkbench !== "undefined") user.isOnWorkbench = isOnWorkbench;
      if (currentProject !== undefined) user.currentProject = currentProject;
      if (availability) user.availability = availability;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      employeeId: updatedUser.employeeId,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
      designation: updatedUser.designation,
      status: updatedUser.status,
      isOnWorkbench: updatedUser.isOnWorkbench,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/users/:id - Deactivate user (Admin only)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Employee not found" });

    user.status = "inactive";
    user.isOnline = false;
    await user.save();

    res.json({ message: "Employee deactivated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/users/workbench/list - Get workbench employees
router.get("/workbench/list", protect, async (req, res) => {
  try {
    const users = await User.find({
      isOnWorkbench: true,
      status: "active",
    }).select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/users/workbench/assign/:id - Assign workbench employee to project
router.put("/workbench/assign/:id", protect, hrOrAdmin, async (req, res) => {
  try {
    const { project } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "Employee not found" });

    user.isOnWorkbench = false;
    user.currentProject = project;
    user.availability = "unavailable";
    await user.save();

    res.json({ message: `${user.name} assigned to ${project}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
