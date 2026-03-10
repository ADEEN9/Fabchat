import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import API from "../services/api";
import { getAvatarColor, getInitials, formatTime, truncate } from "../utils/helpers";
import {
  FiSend, FiPaperclip, FiSearch, FiPlus, FiUsers,
  FiX, FiImage, FiFile, FiMoreVertical
} from "react-icons/fi";
import "./ChatPage.css";

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const navigate = useNavigate();

  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [typing, setTyping] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch chats list
  const fetchChats = useCallback(async () => {
    try {
      const { data } = await API.get("/chats");
      setChats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
    API.get("/users").then(res => setAllUsers(res.data)).catch(() => {});
  }, [fetchChats]);

  // Load chat from URL param
  useEffect(() => {
    if (chatId && chats.length > 0) {
      const chat = chats.find(c => c._id === chatId);
      if (chat) selectChat(chat);
    }
  }, [chatId, chats]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("message_received", (msg) => {
      if (selectedChat && msg.chat._id === selectedChat._id) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      fetchChats(); // refresh list
    });

    socket.on("typing", ({ chatId: cId, userId }) => {
      if (selectedChat && cId === selectedChat._id && userId !== user._id) {
        const typer = selectedChat.participants?.find(p => p._id === userId);
        setTyping(typer?.name || "Someone");
      }
    });

    socket.on("stop_typing", ({ chatId: cId }) => {
      if (selectedChat && cId === selectedChat._id) setTyping(null);
    });

    return () => {
      socket.off("message_received");
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [socket, selectedChat, user._id, fetchChats]);

  // Select a chat
  const selectChat = async (chat) => {
    setSelectedChat(chat);
    setTyping(null);
    socket?.emit("join_chat", chat._id);
    navigate(`/chat/${chat._id}`, { replace: true });

    try {
      const { data } = await API.get(`/messages/${chat._id}`);
      setMessages(data);
      setTimeout(scrollToBottom, 100);
      await API.put(`/messages/read/${chat._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMsg.trim() && !newMsg) return;

    socket?.emit("stop_typing", selectedChat._id, user._id);

    try {
      const { data } = await API.post("/messages", {
        content: newMsg,
        chatId: selectedChat._id,
      });
      setMessages(prev => [...prev, data]);
      setNewMsg("");
      scrollToBottom();
      socket?.emit("new_message", data);
      fetchChats();
    } catch (err) {
      console.error(err);
    }
  };

  // Handle typing
  const handleTyping = (val) => {
    setNewMsg(val);
    if (!socket || !selectedChat) return;

    socket.emit("typing", selectedChat._id, user._id);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", selectedChat._id, user._id);
    }, 2000);
  };

  // File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data: fileData } = await API.post("/messages/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const msgType = file.type.startsWith("image/") ? "image"
        : file.type.startsWith("video/") ? "video"
        : file.type.startsWith("audio/") ? "audio"
        : "document";

      const { data: msg } = await API.post("/messages", {
        content: `📎 ${file.name}`,
        chatId: selectedChat._id,
        messageType: msgType,
        fileUrl: fileData.fileUrl,
        fileName: fileData.fileName,
      });

      setMessages(prev => [...prev, msg]);
      scrollToBottom();
      socket?.emit("new_message", msg);
      fetchChats();
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  // Create group
  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length < 1) return;
    try {
      const { data } = await API.post("/chats/group", {
        name: groupName,
        participants: groupMembers,
      });
      setShowGroupModal(false);
      setGroupName("");
      setGroupMembers([]);
      fetchChats();
      selectChat(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Helper: get chat display info
  const getChatInfo = (chat) => {
    if (chat.isGroupChat) {
      return { name: chat.chatName, initial: "G" };
    }
    const other = chat.participants?.find(p => p._id !== user._id);
    return { name: other?.name || "Unknown", initial: getInitials(other?.name), isOnline: onlineUsers.includes(other?._id) };
  };

  // Filter chats
  const filteredChats = chats.filter(c => {
    const info = getChatInfo(c);
    return info.name.toLowerCase().includes(searchQ.toLowerCase());
  });

  return (
    <div className="chat-page page-enter">
      {/* Chat List Sidebar */}
      <div className={`chat-sidebar ${selectedChat ? "hide-mobile" : ""}`}>
        <div className="chat-sidebar-header">
          <h2>Chats</h2>
          <button className="btn btn-primary btn-sm" onClick={() => setShowGroupModal(true)}>
            <FiPlus /> New Group
          </button>
        </div>

        <div className="chat-search">
          <FiSearch className="search-icon" />
          <input
            className="input search-input"
            placeholder="Search chats..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
        </div>

        <div className="chat-list">
          {loading ? (
            <div className="empty-state"><div className="spinner"></div></div>
          ) : filteredChats.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: "0.85rem" }}>No chats yet. Visit the Directory to start one!</p>
            </div>
          ) : (
            filteredChats.map(chat => {
              const info = getChatInfo(chat);
              const isActive = selectedChat?._id === chat._id;
              return (
                <div
                  key={chat._id}
                  className={`chat-list-item ${isActive ? "active" : ""}`}
                  onClick={() => selectChat(chat)}
                >
                  <div className="avatar" style={{ background: getAvatarColor(info.name) }}>
                    {info.initial}
                    {!chat.isGroupChat && <div className={`status-dot ${info.isOnline ? "online" : "offline"}`}></div>}
                  </div>
                  <div className="chat-list-info">
                    <span className="chat-list-name">{info.name}</span>
                    <span className="chat-list-msg">
                      {chat.latestMessage
                        ? truncate(chat.latestMessage.content || "📎 File", 35)
                        : "No messages yet"}
                    </span>
                  </div>
                  <div className="chat-list-meta">
                    <span className="chat-list-time">{formatTime(chat.updatedAt)}</span>
                    {chat.isGroupChat && <span className="badge badge-primary" style={{ fontSize: "0.6rem" }}>Group</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`chat-window ${!selectedChat ? "hide-mobile" : ""}`}>
        {!selectedChat ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose from your existing chats or start a new one from the Directory</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <button className="btn btn-ghost btn-icon back-btn" onClick={() => { setSelectedChat(null); navigate("/chat"); }}>
                ←
              </button>
              <div className="avatar" style={{ background: getAvatarColor(getChatInfo(selectedChat).name) }}>
                {getChatInfo(selectedChat).initial}
              </div>
              <div className="chat-header-info">
                <h3>{getChatInfo(selectedChat).name}</h3>
                <span className="chat-header-status">
                  {typing ? `${typing} is typing...` :
                    selectedChat.isGroupChat
                      ? `${selectedChat.participants?.length} members`
                      : getChatInfo(selectedChat).isOnline ? "Online" : "Offline"}
                </span>
              </div>
              {selectedChat.isGroupChat && (
                <div className="chat-header-members">
                  <FiUsers /> {selectedChat.participants?.length}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="chat-messages">
              {messages.map((msg, idx) => {
                const isMine = msg.sender?._id === user._id || msg.sender === user._id;
                return (
                  <div key={msg._id || idx} className={`message ${isMine ? "mine" : "theirs"}`}>
                    {!isMine && (
                      <div className="avatar avatar-sm" style={{ background: getAvatarColor(msg.sender?.name) }}>
                        {getInitials(msg.sender?.name)}
                      </div>
                    )}
                    <div className="message-bubble">
                      {!isMine && selectedChat.isGroupChat && (
                        <span className="message-sender">{msg.sender?.name}</span>
                      )}
                      {msg.messageType === "image" && msg.fileUrl && (
                        <img src={`http://localhost:5000${msg.fileUrl}`} alt="shared" className="message-image" />
                      )}
                      {msg.messageType === "document" && msg.fileUrl && (
                        <a href={`http://localhost:5000${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" className="message-file">
                          <FiFile /> {msg.fileName || "Download File"}
                        </a>
                      )}
                      {msg.content && <p className="message-text">{msg.content}</p>}
                      <span className="message-time">
                        {formatTime(msg.createdAt)}
                        {isMine && msg.readBy?.length > 1 && <span className="read-tick"> ✓✓</span>}
                      </span>
                    </div>
                  </div>
                );
              })}
              {typing && (
                <div className="message theirs">
                  <div className="message-bubble typing-bubble">
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-area" onSubmit={sendMessage}>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: "none" }} />
              <button type="button" className="btn btn-ghost btn-icon" onClick={() => fileInputRef.current?.click()}>
                <FiPaperclip />
              </button>
              <input
                className="input chat-input"
                placeholder="Type a message..."
                value={newMsg}
                onChange={(e) => handleTyping(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-icon send-btn" disabled={!newMsg.trim()}>
                <FiSend />
              </button>
            </form>
          </>
        )}
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Group Chat</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowGroupModal(false)}><FiX /></button>
            </div>

            <div className="input-group">
              <label>Group Name</label>
              <input className="input" placeholder="e.g. Project Alpha Team" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Add Members ({groupMembers.length} selected)</label>
              <div className="member-picker">
                {allUsers.filter(u => u._id !== user._id).map(u => (
                  <label key={u._id} className={`member-option ${groupMembers.includes(u._id) ? "selected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={groupMembers.includes(u._id)}
                      onChange={(e) => {
                        if (e.target.checked) setGroupMembers(prev => [...prev, u._id]);
                        else setGroupMembers(prev => prev.filter(id => id !== u._id));
                      }}
                    />
                    <div className="avatar avatar-sm" style={{ background: getAvatarColor(u.name) }}>
                      {getInitials(u.name)}
                    </div>
                    <span>{u.name}</span>
                    <span className="member-dept">{u.department}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }} onClick={createGroup} disabled={!groupName.trim() || groupMembers.length < 1}>
              Create Group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
