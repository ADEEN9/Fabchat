const express = require("express");
const Mail = require("../models/Mail");
const { protect } = require("../middleware/auth");

const router = express.Router();

// POST /api/mail - Send mail
router.post("/", protect, async (req, res) => {
  try {
    const { to, cc, subject, body, attachments, priority, mailType, groupId } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: "to, subject, and body are required" });
    }

    // Create mail for sender (sent folder)
    const sentMail = await Mail.create({
      from: req.user._id,
      to,
      cc: cc || [],
      subject,
      body,
      attachments: attachments || [],
      folder: "sent",
      priority: priority || "normal",
      mailType: mailType || "individual",
      groupId: groupId || null,
      readBy: [req.user._id],
    });

    // Create mail for each recipient (inbox)
    const allRecipients = [...new Set([...(to || []), ...(cc || [])])];
    for (const recipientId of allRecipients) {
      await Mail.create({
        from: req.user._id,
        to,
        cc: cc || [],
        subject,
        body,
        attachments: attachments || [],
        folder: "inbox",
        priority: priority || "normal",
        mailType: mailType || "individual",
        groupId: groupId || null,
      });
    }

    const populated = await Mail.findById(sentMail._id)
      .populate("from", "name email employeeId avatar")
      .populate("to", "name email employeeId avatar")
      .populate("cc", "name email employeeId avatar");

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/mail - Get mail (inbox/sent/draft/trash)
router.get("/", protect, async (req, res) => {
  try {
    const { folder = "inbox" } = req.query;
    let query = {};

    if (folder === "sent") {
      query = { from: req.user._id, folder: "sent" };
    } else if (folder === "inbox") {
      query = {
        $or: [
          { to: { $elemMatch: { $eq: req.user._id } } },
          { cc: { $elemMatch: { $eq: req.user._id } } },
        ],
        folder: "inbox",
      };
    } else {
      query = { from: req.user._id, folder };
    }

    const mails = await Mail.find(query)
      .populate("from", "name email employeeId avatar")
      .populate("to", "name email employeeId avatar")
      .populate("cc", "name email employeeId avatar")
      .sort({ createdAt: -1 });

    res.json(mails);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/mail/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id)
      .populate("from", "name email employeeId avatar")
      .populate("to", "name email employeeId avatar")
      .populate("cc", "name email employeeId avatar");

    if (!mail) return res.status(404).json({ message: "Mail not found" });

    // Mark as read
    if (!mail.readBy.includes(req.user._id)) {
      mail.readBy.push(req.user._id);
      mail.isRead = true;
      await mail.save();
    }

    res.json(mail);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/mail/:id - Move to trash
router.delete("/:id", protect, async (req, res) => {
  try {
    const mail = await Mail.findById(req.params.id);
    if (!mail) return res.status(404).json({ message: "Mail not found" });

    mail.folder = "trash";
    await mail.save();

    res.json({ message: "Mail moved to trash" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
