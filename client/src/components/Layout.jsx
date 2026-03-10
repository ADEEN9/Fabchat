import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAvatarColor, getInitials } from "../utils/helpers";
import {
  FiHome, FiUsers, FiMessageSquare, FiMail,
  FiBriefcase, FiShield, FiLogOut, FiMenu, FiX
} from "react-icons/fi";
import { useState } from "react";
import "./Layout.css";

const navItems = [
  { to: "/", icon: <FiHome />, label: "Dashboard", end: true },
  { to: "/directory", icon: <FiUsers />, label: "Directory" },
  { to: "/chat", icon: <FiMessageSquare />, label: "Chat" },
  { to: "/mail", icon: <FiMail />, label: "Mail" },
  { to: "/workbench", icon: <FiBriefcase />, label: "Workbench" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "admin" || user?.role === "hr";

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          {!collapsed && (
            <div className="logo">
              <div className="logo-icon">F</div>
              <span className="logo-text">FabChat</span>
            </div>
          )}
          <button className="btn-icon btn-ghost collapse-btn" onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}>
            {collapsed ? <FiMenu /> : <FiX className="mobile-only-icon" />}
            {!collapsed && <FiMenu className="desktop-only-icon" />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? "Admin" : ""}
            >
              <span className="nav-icon"><FiShield /></span>
              {!collapsed && <span className="nav-label">Admin</span>}
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card" title={user?.name}>
            <div className="avatar avatar-sm" style={{ background: getAvatarColor(user?.name) }}>
              {getInitials(user?.name)}
            </div>
            {!collapsed && (
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            )}
          </div>
          <button className="btn-icon btn-ghost logout-btn" onClick={handleLogout} title="Logout">
            <FiLogOut />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="mobile-header">
          <button className="btn-icon btn-ghost" onClick={() => setMobileOpen(true)}>
            <FiMenu />
          </button>
          <div className="logo">
            <div className="logo-icon logo-icon-sm">F</div>
            <span className="logo-text">FabChat</span>
          </div>
          <div style={{ width: 36 }}></div>
        </div>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
