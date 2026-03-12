import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import "./Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/auth/forgot-password", { email });
      toast.success(res.data.message || "Reset link sent if email exists");
      setEmail("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <span className="auth-logo-icon">🔐</span>
          <h1>Forgot Password</h1>
          <p>We will send a reset link to your email</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@lab.com"
              autoComplete="email"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-footer">
          Back to <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
