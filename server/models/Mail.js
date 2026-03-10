const mongoose = require("mongoose");

const mailSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    cc: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
      },
    ],
    isRead: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    folder: {
      type: String,
      enum: ["inbox", "sent", "draft", "trash"],
      default: "inbox",
    },
    mailType: {
      type: String,
      enum: ["individual", "group"],
      default: "individual",
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
    },
    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mail", mailSchema);
