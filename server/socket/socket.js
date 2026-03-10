const User = require("../models/User");

const setupSocket = (io) => {
  // Store active connections
  const activeUsers = new Map();

  io.on("connection", (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User comes online
    socket.on("setup", async (userId) => {
      socket.join(userId);
      activeUsers.set(userId, socket.id);

      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
      } catch (err) {
        console.error("Error updating online status:", err);
      }

      socket.broadcast.emit("user_online", userId);
      console.log(`👤 User online: ${userId}`);
    });

    // Join a chat room
    socket.on("join_chat", (chatId) => {
      socket.join(chatId);
      console.log(`📁 User joined chat room: ${chatId}`);
    });

    // Leave a chat room
    socket.on("leave_chat", (chatId) => {
      socket.leave(chatId);
    });

    // New message
    socket.on("new_message", (newMessage) => {
      const chat = newMessage.chat;
      if (!chat || !chat.participants) return;

      chat.participants.forEach((participant) => {
        if (participant._id === newMessage.sender._id) return;
        socket.in(participant._id).emit("message_received", newMessage);
      });
    });

    // Typing indicator
    socket.on("typing", (chatId, userId) => {
      socket.in(chatId).emit("typing", { chatId, userId });
    });

    socket.on("stop_typing", (chatId, userId) => {
      socket.in(chatId).emit("stop_typing", { chatId, userId });
    });

    // Read receipt
    socket.on("message_read", (data) => {
      socket.in(data.chatId).emit("message_read", data);
    });

    // New mail notification
    socket.on("new_mail", (recipientIds) => {
      recipientIds.forEach((id) => {
        socket.in(id).emit("mail_received");
      });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      let disconnectedUserId = null;

      for (const [userId, socketId] of activeUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          activeUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        try {
          await User.findByIdAndUpdate(disconnectedUserId, {
            isOnline: false,
            lastSeen: new Date(),
          });
        } catch (err) {
          console.error("Error updating offline status:", err);
        }

        socket.broadcast.emit("user_offline", disconnectedUserId);
        console.log(`👋 User offline: ${disconnectedUserId}`);
      }
    });
  });
};

module.exports = setupSocket;
