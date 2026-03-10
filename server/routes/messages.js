const express = require("express");
const Message = require("../models/Message");
const Chat = require("../models/Chat");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// POST /api/messages - Send message
router.post("/", protect, async (req, res) => {
  try {
    const { content, chatId, messageType, fileUrl, fileName } = req.body;

    if (!chatId) {
      return res.status(400).json({ message: "chatId required" });
    }

    const msgData = {
      sender: req.user._id,
      content: content || "",
      chat: chatId,
      messageType: messageType || "text",
      fileUrl: fileUrl || "",
      fileName: fileName || "",
      readBy: [req.user._id],
    };

    let message = await Message.create(msgData);

    message = await message.populate("sender", "name avatar email employeeId");
    message = await message.populate("chat");
    message = await message.populate({
      path: "chat.participants",
      select: "name avatar email employeeId",
    });

    // Update latest message
    await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/messages/:chatId - Get messages for a chat
router.get("/:chatId", protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name avatar email employeeId")
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT /api/messages/read/:chatId - Mark messages as read
router.put("/read/:chatId", protect, async (req, res) => {
  try {
    await Message.updateMany(
      {
        chat: req.params.chatId,
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/messages/upload - Upload file
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
