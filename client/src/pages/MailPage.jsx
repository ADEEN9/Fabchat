import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { getAvatarColor, getInitials, formatDate } from "../utils/helpers";
import {
  FiInbox, FiSend as FiSendIcon, FiTrash2, FiPlus, FiX,
  FiChevronLeft, FiPaperclip, FiStar
} from "react-icons/fi";
import "./MailPage.css";

export default function MailPage() {
  const { user } = useAuth();
  const [mails, setMails] = useState([]);
  const [folder, setFolder] = useState("inbox");
  const [selectedMail, setSelectedMail] = useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [allUsers, setAllUsers] = useState([]);
  const [toIds, setToIds] = useState([]);
  const [ccIds, setCcIds] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMails();
  }, [folder]);

  useEffect(() => {
    API.get("/users").then(res => setAllUsers(res.data)).catch(() => {});
  }, []);

  const fetchMails = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/mail?folder=${folder}`);
      setMails(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openMail = async (mail) => {
    setSelectedMail(mail);
    // Mark as read
    try {
      await API.get(`/mail/${mail._id}`);
    } catch (err) {}
  };

  const deleteMail = async (id) => {
    try {
      await API.delete(`/mail/${id}`);
      setMails(prev => prev.filter(m => m._id !== id));
      if (selectedMail?._id === id) setSelectedMail(null);
    } catch (err) {
      console.error(err);
    }
  };

  const sendMail = async () => {
    if (!toIds.length || !subject.trim() || !body.trim()) return;
    setSending(true);
    try {
      await API.post("/mail", {
        to: toIds,
        cc: ccIds,
        subject,
        body,
        priority,
      });
      setShowCompose(false);
      resetCompose();
      if (folder === "sent") fetchMails();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const resetCompose = () => {
    setToIds([]);
    setCcIds([]);
    setSubject("");
    setBody("");
    setPriority("normal");
  };

  const folders = [
    { key: "inbox", label: "Inbox", icon: <FiInbox /> },
    { key: "sent", label: "Sent", icon: <FiSendIcon /> },
    { key: "trash", label: "Trash", icon: <FiTrash2 /> },
  ];

  const getPriorityBadge = (p) => {
    const map = { urgent: "badge-danger", high: "badge-warning", normal: "badge-info", low: "badge-primary" };
    return map[p] || "badge-info";
  };

  return (
    <div className="mail-page page-enter">
      {/* Mail Sidebar */}
      <div className="mail-sidebar">
        <button className="btn btn-primary compose-btn" onClick={() => setShowCompose(true)}>
          <FiPlus /> Compose
        </button>

        <nav className="mail-folders">
          {folders.map(f => (
            <button
              key={f.key}
              className={`mail-folder-btn ${folder === f.key ? "active" : ""}`}
              onClick={() => { setFolder(f.key); setSelectedMail(null); }}
            >
              {f.icon}
              <span>{f.label}</span>
              {f.key === "inbox" && mails.length > 0 && folder === "inbox" && (
                <span className="folder-count">{mails.length}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Mail List */}
      <div className={`mail-list ${selectedMail ? "hide-mobile" : ""}`}>
        <div className="mail-list-header">
          <h2>{folders.find(f => f.key === folder)?.label}</h2>
          <span className="mail-count">{mails.length} messages</span>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner"></div></div>
        ) : mails.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <h3>No messages</h3>
            <p>Your {folder} is empty</p>
          </div>
        ) : (
          <div className="mail-items">
            {mails.map(mail => (
              <div
                key={mail._id}
                className={`mail-item ${selectedMail?._id === mail._id ? "active" : ""} ${!mail.readBy?.includes(user._id) ? "unread" : ""}`}
                onClick={() => openMail(mail)}
              >
                <div className="avatar avatar-sm" style={{ background: getAvatarColor(mail.from?.name) }}>
                  {getInitials(mail.from?.name)}
                </div>
                <div className="mail-item-info">
                  <div className="mail-item-top">
                    <span className="mail-item-from">{mail.from?.name || "Unknown"}</span>
                    <span className="mail-item-date">{formatDate(mail.createdAt)}</span>
                  </div>
                  <span className="mail-item-subject">{mail.subject}</span>
                  <span className="mail-item-preview">{mail.body?.slice(0, 80)}...</span>
                </div>
                {mail.priority !== "normal" && (
                  <span className={`badge ${getPriorityBadge(mail.priority)}`} style={{ fontSize: "0.6rem" }}>
                    {mail.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mail Detail */}
      <div className={`mail-detail ${!selectedMail ? "hide-mobile" : ""}`}>
        {!selectedMail ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">📧</div>
            <h3>Select a message</h3>
            <p>Choose a message from the list to read it</p>
          </div>
        ) : (
          <>
            <div className="mail-detail-header">
              <button className="btn btn-ghost btn-icon mobile-back" onClick={() => setSelectedMail(null)}>
                <FiChevronLeft />
              </button>
              <h2 className="mail-detail-subject">{selectedMail.subject}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => deleteMail(selectedMail._id)}>
                <FiTrash2 />
              </button>
            </div>

            <div className="mail-detail-meta">
              <div className="avatar" style={{ background: getAvatarColor(selectedMail.from?.name) }}>
                {getInitials(selectedMail.from?.name)}
              </div>
              <div>
                <strong>{selectedMail.from?.name}</strong>
                <span className="mail-detail-email">{selectedMail.from?.email}</span>
                <div className="mail-detail-recipients">
                  To: {selectedMail.to?.map(t => t.name).join(", ")}
                  {selectedMail.cc?.length > 0 && <> | CC: {selectedMail.cc.map(c => c.name).join(", ")}</>}
                </div>
              </div>
              <span className="mail-detail-date">{formatDate(selectedMail.createdAt)}</span>
            </div>

            <div className="mail-detail-body">
              {selectedMail.body}
            </div>
          </>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Compose Mail</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowCompose(false); resetCompose(); }}><FiX /></button>
            </div>

            <div className="input-group">
              <label>To</label>
              <select className="input" multiple size="3" value={toIds} onChange={e => setToIds(Array.from(e.target.selectedOptions, o => o.value))}>
                {allUsers.filter(u => u._id !== user._id).map(u => (
                  <option key={u._id} value={u._id}>{u.name} ({u.department})</option>
                ))}
              </select>
              <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Hold Ctrl to select multiple</small>
            </div>

            <div className="input-group" style={{ marginTop: 12 }}>
              <label>CC (Optional)</label>
              <select className="input" multiple size="2" value={ccIds} onChange={e => setCcIds(Array.from(e.target.selectedOptions, o => o.value))}>
                {allUsers.filter(u => u._id !== user._id).map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginTop: 12 }}>
              <label>Subject</label>
              <input className="input" placeholder="Enter subject" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            <div className="input-group" style={{ marginTop: 12 }}>
              <label>Priority</label>
              <select className="input" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="input-group" style={{ marginTop: 12 }}>
              <label>Message</label>
              <textarea className="input" rows="6" placeholder="Write your message..." value={body} onChange={e => setBody(e.target.value)} />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", marginTop: 20 }}
              onClick={sendMail}
              disabled={sending || !toIds.length || !subject.trim() || !body.trim()}
            >
              {sending ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : <><FiSendIcon /> Send Mail</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
