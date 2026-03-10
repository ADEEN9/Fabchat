const express = require("express");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// POST /api/chats - Create or access 1-to-1 chat
router.post("/", protect, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId required" });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      isGroupChat: false,
      $and: [
        { participants: { $elemMatch: { $eq: req.user._id } } },
        { participants: { $elemMatch: { $eq: userId } } },
      ],
    })
      .populate("participants", "-password")
      .populate("latestMessage");

    if (chat) {
      return res.json(chat);
    }

    // Create new chat
    chat = await Chat.create({
      chatName: "direct",
      isGroupChat: false,
      participants: [req.user._id, userId],
    });

    const fullChat = await Chat.findById(chat._id).populate(
      "participants",
      "-password"
    );

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/chats - Get all chats for user
router.get("/", protect, async (req, res) => {
  try {
    let chats = await Chat.find({
      participants: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("participants", "-password")
      .populate("groupAdmin", "-password")
      .populate({
        path: "latestMessage",
        populate: { path: "sender", select: "name email avatar" },
      })
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/chats/group - Create group chat
router.post("/group", protect, async (req, res) => {
  try {
    const { name, participants, description } = req.body;

    if (!name || !participants || participants.length < 1) {
      return res
        .status(400)
        .json({ message: "Group name and at least 1 participant required" });
    }

    // Add creator to participants
    const allParticipants = [...new Set([...participants, req.user._id.toString()])];

    const groupChat = await Chat.create({
      chatName: name,
      isGroupChat: true,
      participants: allParticipants,
      groupAdmin: req.user._id,
      groupDescription: description || "",
    });

    const fullChat = await Chat.findById(groupChat._id)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    res.status(201).json(fullChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/chats/group/:id - Update group
router.put("/group/:id", protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group not found" });

    if (chat.groupAdmin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only group admin can update" });
    }

    const { chatName, groupDescription } = req.body;
    if (chatName) chat.chatName = chatName;
    if (groupDescription) chat.groupDescription = groupDescription;

    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/chats/group/:id/add - Add member to group
router.put("/group/:id/add", protect, async (req, res) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) return res.status(404).json({ message: "Group not found" });
    if (chat.groupAdmin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only group admin can add members" });
    }

    if (chat.participants.includes(userId)) {
      return res.status(400).json({ message: "User already in group" });
    }

    chat.participants.push(userId);
    // Remove from pending if exists
    chat.pendingRequests = chat.pendingRequests.filter(
      (id) => id.toString() !== userId
    );
    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/chats/group/:id/remove - Remove member from group
router.put("/group/:id/remove", protect, async (req, res) => {
  try {
    const { userId } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) return res.status(404).json({ message: "Group not found" });
    if (chat.groupAdmin.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only group admin can remove members" });
    }

    chat.participants = chat.participants.filter(
      (id) => id.toString() !== userId
    );
    await chat.save();

    const updatedChat = await Chat.findById(chat._id)
      .populate("participants", "-password")
      .populate("groupAdmin", "-password");

    res.json(updatedChat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/chats/group/:id/request - Request to join group
router.post("/group/:id/request", protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: "Group not found" });

    if (chat.participants.includes(req.user._id)) {
      return res.status(400).json({ message: "Already a member" });
    }

    if (chat.pendingRequests.includes(req.user._id)) {
      return res.status(400).json({ message: "Request already pending" });
    }

    chat.pendingRequests.push(req.user._id);
    await chat.save();

    res.json({ message: "Join request sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
