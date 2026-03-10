import { useEffect, useState } from "react";
import API from "../services/api";
import { getAvatarColor, getInitials } from "../utils/helpers";
import {
  FiUserPlus, FiUsers, FiShield, FiX, FiSearch,
  FiEdit2, FiTrash2, FiCheck, FiAlertTriangle
} from "react-icons/fi";
import "./AdminPanel.css";

export default function AdminPanel() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [toast, setToast] = useState(null);

  // New employee form
  const [form, setForm] = useState({
    employeeId: "", name: "", email: "", password: "",
    role: "employee", department: "", designation: "", phone: "", skills: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, [search]);

  const fetchEmployees = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      const { data } = await API.get("/users", { params });
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addEmployee = async () => {
    try {
      const payload = {
        ...form,
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      };
      await API.post("/auth/register", payload);
      showToast(`${form.name} added successfully!`);
      setShowAddModal(false);
      setForm({ employeeId: "", name: "", email: "", password: "", role: "employee", department: "", designation: "", phone: "", skills: "" });
      fetchEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to add employee", "error");
    }
  };

  const updateEmployee = async () => {
    if (!editUser) return;
    try {
      await API.put(`/users/${editUser._id}`, {
        role: editUser.role,
        department: editUser.department,
        designation: editUser.designation,
        status: editUser.status,
        isOnWorkbench: editUser.isOnWorkbench,
      });
      showToast(`${editUser.name} updated`);
      setEditUser(null);
      fetchEmployees();
    } catch (err) {
      showToast("Update failed", "error");
    }
  };

  const deactivateEmployee = async (emp) => {
    if (!window.confirm(`Deactivate ${emp.name}? They will no longer be able to log in.`)) return;
    try {
      await API.delete(`/users/${emp._id}`);
      showToast(`${emp.name} deactivated`);
      fetchEmployees();
    } catch (err) {
      showToast("Deactivation failed", "error");
    }
  };

  const getRoleBadge = (r) => {
    const map = { admin: "badge-danger", hr: "badge-warning", employee: "badge-info" };
    return map[r] || "badge-info";
  };

  return (
    <div className="admin-panel page-enter">
      {/* Toast */}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Panel</h1>
          <p className="page-subtitle">Manage employees, roles, and system settings</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <FiUserPlus /> Add Employee
        </button>
      </div>

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat">
          <FiUsers className="admin-stat-icon" style={{ color: "var(--primary-400)" }} />
          <div>
            <span className="admin-stat-val">{employees.length}</span>
            <span className="admin-stat-lbl">Total Active</span>
          </div>
        </div>
        <div className="admin-stat">
          <FiShield className="admin-stat-icon" style={{ color: "var(--danger)" }} />
          <div>
            <span className="admin-stat-val">{employees.filter(e => e.role === "admin").length}</span>
            <span className="admin-stat-lbl">Admins</span>
          </div>
        </div>
        <div className="admin-stat">
          <FiUsers className="admin-stat-icon" style={{ color: "var(--warning)" }} />
          <div>
            <span className="admin-stat-val">{employees.filter(e => e.role === "hr").length}</span>
            <span className="admin-stat-lbl">HR</span>
          </div>
        </div>
        <div className="admin-stat">
          <FiAlertTriangle className="admin-stat-icon" style={{ color: "var(--accent-500)" }} />
          <div>
            <span className="admin-stat-val">{employees.filter(e => e.isOnWorkbench).length}</span>
            <span className="admin-stat-lbl">Workbench</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="admin-search">
        <FiSearch className="search-icon" />
        <input
          className="input search-input"
          placeholder="Search employees..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Employee Table */}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th>Department</th>
              <th>Role</th>
              <th>Status</th>
              <th>Workbench</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7"><div className="empty-state"><div className="spinner"></div></div></td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan="7"><div className="empty-state"><p>No employees found</p></div></td></tr>
            ) : (
              employees.map(emp => (
                <tr key={emp._id}>
                  <td>
                    <div className="table-user">
                      <div className="avatar avatar-sm" style={{ background: getAvatarColor(emp.name) }}>
                        {getInitials(emp.name)}
                      </div>
                      <div>
                        <span className="table-name">{emp.name}</span>
                        <span className="table-email">{emp.email}</span>
                      </div>
                    </div>
                  </td>
                  <td><code className="table-id">{emp.employeeId}</code></td>
                  <td>{emp.department || "—"}</td>
                  <td><span className={`badge ${getRoleBadge(emp.role)}`}>{emp.role}</span></td>
                  <td><span className={`badge ${emp.status === "active" ? "badge-success" : "badge-danger"}`}>{emp.status}</span></td>
                  <td>{emp.isOnWorkbench ? "✅" : "—"}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => setEditUser({ ...emp })}>
                        <FiEdit2 />
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Deactivate" onClick={() => deactivateEmployee(emp)} style={{ color: "var(--danger)" }}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Employee</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}><FiX /></button>
            </div>

            <div className="modal-form-grid">
              <div className="input-group">
                <label>Employee ID *</label>
                <input className="input" placeholder="FAB009" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value.toUpperCase() })} />
              </div>
              <div className="input-group">
                <label>Full Name *</label>
                <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Email *</label>
                <input className="input" type="email" placeholder="john@fabchat.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Password *</label>
                <input className="input" type="password" placeholder="Min 6 chars" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Role</label>
                <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="employee">Employee</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="input-group">
                <label>Department</label>
                <input className="input" placeholder="Engineering" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Designation</label>
                <input className="input" placeholder="Senior Developer" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Phone</label>
                <input className="input" placeholder="9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label>Skills (comma separated)</label>
                <input className="input" placeholder="React, Node.js, MongoDB" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }} onClick={addEmployee}
              disabled={!form.employeeId || !form.name || !form.email || !form.password}>
              <FiUserPlus /> Add Employee
            </button>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit {editUser.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditUser(null)}><FiX /></button>
            </div>

            <div className="modal-form-grid">
              <div className="input-group">
                <label>Role</label>
                <select className="input" value={editUser.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })}>
                  <option value="employee">Employee</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="input" value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="input-group">
                <label>Department</label>
                <input className="input" value={editUser.department} onChange={e => setEditUser({ ...editUser, department: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Designation</label>
                <input className="input" value={editUser.designation} onChange={e => setEditUser({ ...editUser, designation: e.target.value })} />
              </div>
              <div className="input-group" style={{ gridColumn: "1 / -1" }}>
                <label>On Workbench</label>
                <select className="input" value={editUser.isOnWorkbench ? "yes" : "no"} onChange={e => setEditUser({ ...editUser, isOnWorkbench: e.target.value === "yes" })}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={updateEmployee}>
                <FiCheck /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
