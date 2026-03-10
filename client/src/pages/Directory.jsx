import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useSocket } from "../context/SocketContext";
import { getAvatarColor, getInitials } from "../utils/helpers";
import { FiSearch, FiMessageSquare, FiFilter } from "react-icons/fi";
import "./Directory.css";

export default function Directory() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const { onlineUsers } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, [search, deptFilter]);

  const fetchEmployees = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (deptFilter) params.department = deptFilter;
      const { data } = await API.get("/users", { params });
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (userId) => {
    try {
      const { data } = await API.post("/chats", { userId });
      navigate(`/chat/${data._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];

  return (
    <div className="directory page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employee Directory</h1>
          <p className="page-subtitle">{employees.length} employees found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="directory-filters">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            className="input search-input"
            type="text"
            placeholder="Search by name, ID, department, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-bar">
          <FiFilter className="filter-icon-label" />
          <select
            className="input filter-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Grid */}
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
      ) : employees.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>No employees found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="employee-grid">
          {employees.map((emp) => (
            <div key={emp._id} className="employee-card card">
              <div className="emp-top">
                <div className="avatar avatar-lg" style={{ background: getAvatarColor(emp.name) }}>
                  {getInitials(emp.name)}
                  <div className={`status-dot ${onlineUsers.includes(emp._id) ? "online" : "offline"}`}></div>
                </div>
                <div className="emp-details">
                  <h3 className="emp-name">{emp.name}</h3>
                  <p className="emp-designation">{emp.designation || emp.role}</p>
                  <p className="emp-id">{emp.employeeId}</p>
                </div>
              </div>

              <div className="emp-meta">
                {emp.department && <span className="badge badge-primary">{emp.department}</span>}
                <span className={`badge ${onlineUsers.includes(emp._id) ? "badge-success" : "badge-info"}`}>
                  {onlineUsers.includes(emp._id) ? "Online" : "Offline"}
                </span>
              </div>

              {emp.skills?.length > 0 && (
                <div className="emp-skills">
                  {emp.skills.slice(0, 3).map(s => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                  {emp.skills.length > 3 && <span className="tag">+{emp.skills.length - 3}</span>}
                </div>
              )}

              <button
                className="btn btn-primary btn-sm emp-chat-btn"
                onClick={() => startChat(emp._id)}
              >
                <FiMessageSquare /> Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
