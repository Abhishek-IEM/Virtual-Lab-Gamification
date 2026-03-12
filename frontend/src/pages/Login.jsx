import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "failed") {
      toast.error("Google login failed. Please try again.");
    }
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/auth/login", form);
      login(res.data.user, res.data.token);
      toast.success(`Welcome back, ${res.data.user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-grid" />
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <span className="auth-logo-icon">🔬</span>
          <h1>Virtual Lab</h1>
          <p>AI-Powered Science Experiments</p>
        </div>

        <h2 className="auth-title">Sign In</h2>

        <button
          type="button"
          className="btn-google"
          onClick={() => {
            window.location.href = `${backendUrl}/auth/google`;
          }}
        >
          <span>G</span>
          Login with Google
        </button>

        <div className="auth-divider">or continue with email</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="student@lab.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <span className="btn-loading">Signing in...</span>
            ) : (
              "Sign In to Lab"
            )}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/forgot-password">Forgot password?</Link>
        </p>

        <p className="auth-footer">
          New to Virtual Lab? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
