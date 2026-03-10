import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { FiLock, FiUser, FiEye, FiEyeOff } from "react-icons/fi";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!employeeId || !password) {
      setError("Please enter your Company ID and Password");
      return;
    }
    setLoading(true);
    try {
      await login(employeeId, password);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      <div className="login-container">
        <div className="login-hero">
          <div className="hero-content">
            <div className="logo-icon logo-icon-xl">F</div>
            <h1>FabChat</h1>
            <p>Enterprise Communication Platform</p>
            <div className="hero-features">
              <div className="hero-feat"><span>💬</span> Real-time Messaging</div>
              <div className="hero-feat"><span>📁</span> File Sharing</div>
              <div className="hero-feat"><span>📧</span> Internal Mail</div>
              <div className="hero-feat"><span>👥</span> Team Collaboration</div>
            </div>
          </div>
        </div>

        <div className="login-form-wrapper">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p>Sign in with your company credentials</p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="input-group">
              <label htmlFor="employeeId">Company ID</label>
              <div className="input-icon-wrap">
                <FiUser className="input-prefix-icon" />
                <input
                  id="employeeId"
                  className="input input-with-icon"
                  type="text"
                  placeholder="e.g. FAB001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-icon-wrap">
                <FiLock className="input-prefix-icon" />
                <input
                  id="password"
                  className="input input-with-icon"
                  type={showPw ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : "Sign In"}
            </button>

            <div className="form-footer">
              <p>Authorized employee access only</p>
              <p className="seed-hint">First time? POST to <code>/api/auth/seed</code> to create demo users</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
