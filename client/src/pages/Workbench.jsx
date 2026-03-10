import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { getAvatarColor, getInitials } from "../utils/helpers";
import { FiBriefcase, FiCheck, FiX } from "react-icons/fi";
import "./Workbench.css";

export default function Workbench() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignModal, setAssignModal] = useState(null);
  const [projectName, setProjectName] = useState("");

  const isAdmin = user?.role === "admin" || user?.role === "hr";

  useEffect(() => {
    fetchWorkbench();
  }, []);

  const fetchWorkbench = async () => {
    try {
      const { data } = await API.get("/users?search=");
      const workbenchEmps = data.filter(u => u.isOnWorkbench);
      setEmployees(workbenchEmps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const assignToProject = async () => {
    if (!assignModal || !projectName.trim()) return;
    try {
      await API.put(`/users/${assignModal._id}`, {
        isOnWorkbench: false,
        currentProject: projectName,
        availability: "unavailable",
      });
      setAssignModal(null);
      setProjectName("");
      fetchWorkbench();
    } catch (err) {
      console.error(err);
    }
  };

  const getAvailabilityBadge = (a) => {
    const map = { available: "badge-success", partially_available: "badge-warning", unavailable: "badge-danger" };
    return map[a] || "badge-info";
  };

  return (
    <div className="workbench page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Workbench Employees</h1>
          <p className="page-subtitle">
            {employees.length} employee{employees.length !== 1 ? "s" : ""} currently unassigned
          </p>
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ width: 36, height: 36 }}></div></div>
      ) : employees.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🎯</div>
          <h3>All employees are assigned!</h3>
          <p>No employees are on the workbench right now</p>
        </div>
      ) : (
        <div className="workbench-grid">
          {employees.map((emp) => (
            <div key={emp._id} className="workbench-card card">
              <div className="wb-header">
                <div className="avatar avatar-lg" style={{ background: getAvatarColor(emp.name) }}>
                  {getInitials(emp.name)}
                </div>
                <div className="wb-info">
                  <h3>{emp.name}</h3>
                  <p className="wb-designation">{emp.designation || "Employee"}</p>
                  <p className="wb-id">{emp.employeeId}</p>
                </div>
              </div>

              <div className="wb-details">
                <div className="wb-detail-row">
                  <span className="wb-label">Department</span>
                  <span className="badge badge-primary">{emp.department || "N/A"}</span>
                </div>
                <div className="wb-detail-row">
                  <span className="wb-label">Availability</span>
                  <span className={`badge ${getAvailabilityBadge(emp.availability)}`}>
                    {emp.availability?.replace("_", " ") || "available"}
                  </span>
                </div>
              </div>

              {emp.skills?.length > 0 && (
                <div className="wb-skills">
                  <span className="wb-label">Skills</span>
                  <div className="wb-tags">
                    {emp.skills.map(s => <span key={s} className="tag">{s}</span>)}
                  </div>
                </div>
              )}

              {isAdmin && (
                <button
                  className="btn btn-primary btn-sm wb-assign-btn"
                  onClick={() => setAssignModal(emp)}
                >
                  <FiBriefcase /> Assign to Project
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign to Project</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setAssignModal(null)}><FiX /></button>
            </div>

            <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
              Assign <strong>{assignModal.name}</strong> to a project. This will remove them from the workbench.
            </p>

            <div className="input-group">
              <label>Project Name</label>
              <input
                className="input"
                placeholder="e.g. Project Alpha"
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={assignToProject} disabled={!projectName.trim()}>
                <FiCheck /> Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
