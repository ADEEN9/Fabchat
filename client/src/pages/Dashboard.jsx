import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { getAvatarColor, getInitials, formatTime } from "../utils/helpers";
import {
  FiUsers, FiMessageSquare, FiMail, FiBriefcase,
  FiArrowRight, FiTrendingUp
} from "react-icons/fi";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ users: 0, chats: 0, mails: 0, workbench: 0 });
  const [recentChats, setRecentChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, chatsRes, mailsRes] = await Promise.all([
          API.get("/users"),
          API.get("/chats"),
          API.get("/mail?folder=inbox"),
        ]);

        const workbenchCount = usersRes.data.filter(u => u.isOnWorkbench).length;

        setStats({
          users: usersRes.data.length,
          chats: chatsRes.data.length,
          mails: mailsRes.data.length,
          workbench: workbenchCount,
        });

        setRecentChats(chatsRes.data.slice(0, 5));
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getChatDisplayName = (chat) => {
    if (chat.isGroupChat) return chat.chatName;
    const other = chat.participants?.find(p => p._id !== user._id);
    return other?.name || "Unknown";
  };

  const statCards = [
    { label: "Employees", value: stats.users, icon: <FiUsers />, color: "#6366f1", path: "/directory" },
    { label: "Active Chats", value: stats.chats, icon: <FiMessageSquare />, color: "#14b8a6", path: "/chat" },
    { label: "Inbox", value: stats.mails, icon: <FiMail />, color: "#f59e0b", path: "/mail" },
    { label: "Workbench", value: stats.workbench, icon: <FiBriefcase />, color: "#ec4899", path: "/workbench" },
  ];

  if (loading) {
    return (
      <div className="empty-state">
        <div className="spinner" style={{ width: 36, height: 36 }}></div>
      </div>
    );
  }

  return (
    <div className="dashboard page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Welcome back, <span className="gradient-text">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="page-subtitle">Here's what's happening in your workspace today</p>
        </div>
        <div className="header-badge">
          <FiTrendingUp /> <span>{new Date().toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="stat-card card"
            onClick={() => navigate(s.path)}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
              {s.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
            <FiArrowRight className="stat-arrow" />
          </div>
        ))}
      </div>

      {/* Recent Conversations */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Conversations</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/chat")}>
            View All <FiArrowRight />
          </button>
        </div>

        {recentChats.length === 0 ? (
          <div className="empty-state">
            <div className="icon">💬</div>
            <h3>No conversations yet</h3>
            <p>Start chatting from the Employee Directory</p>
          </div>
        ) : (
          <div className="recent-list">
            {recentChats.map((chat) => {
              const name = getChatDisplayName(chat);
              return (
                <div
                  key={chat._id}
                  className="recent-item card"
                  onClick={() => navigate(`/chat/${chat._id}`)}
                >
                  <div className="avatar" style={{ background: getAvatarColor(name) }}>
                    {chat.isGroupChat ? "G" : getInitials(name)}
                  </div>
                  <div className="recent-info">
                    <span className="recent-name">{name}</span>
                    <span className="recent-msg">
                      {chat.latestMessage?.content
                        ? chat.latestMessage.content.slice(0, 50)
                        : "No messages yet"}
                    </span>
                  </div>
                  <div className="recent-meta">
                    <span className="recent-time">{formatTime(chat.updatedAt)}</span>
                    {chat.isGroupChat && <span className="badge badge-primary">Group</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h2>Quick Actions</h2>
        <div className="quick-actions">
          <button className="quick-action-card card" onClick={() => navigate("/directory")}>
            <FiUsers className="qa-icon" />
            <span>Find Employee</span>
          </button>
          <button className="quick-action-card card" onClick={() => navigate("/chat")}>
            <FiMessageSquare className="qa-icon" />
            <span>New Chat</span>
          </button>
          <button className="quick-action-card card" onClick={() => navigate("/mail")}>
            <FiMail className="qa-icon" />
            <span>Compose Mail</span>
          </button>
          <button className="quick-action-card card" onClick={() => navigate("/workbench")}>
            <FiBriefcase className="qa-icon" />
            <span>View Workbench</span>
          </button>
        </div>
      </div>
    </div>
  );
}
