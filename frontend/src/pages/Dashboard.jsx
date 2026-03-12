import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

const BADGE_INFO = {
  "First Experiment": {
    icon: "🥇",
    description: "Completed your first experiment!",
  },
  "Lab Beginner": { icon: "🧪", description: "Completed 2 experiments!" },
  "Chemistry Explorer": {
    icon: "⚗️",
    description: "Completed 2 chemistry experiments!",
  },
};

const DIFFICULTY_COLOR = {
  Beginner: "#10b981",
  Intermediate: "#f59e0b",
  Advanced: "#ef4444",
};

export default function Dashboard() {
  const { user, logout, updateUser } = useAuth();
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExperiments();
    fetchProfile();
  }, []);

  const fetchExperiments = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/experiments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExperiments(res.data.experiments);
    } catch (err) {
      toast.error("Failed to load experiments");
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      updateUser(res.data.user);
    } catch (err) {
      // silently ignore
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const completedCount = user?.experimentsCompleted?.length || 0;
  const totalExp = experiments.length || 3;
  const progressPercent = Math.round((completedCount / totalExp) * 100);

  return (
    <div className="dashboard-page">
      <div className="dashboard-bg-grid" />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="navbar-icon">🔬</span>
          <span>Virtual Lab</span>
        </div>
        <div className="navbar-user">
          <div className="user-points">
            <span className="points-icon">⭐</span>
            <span className="points-value">{user?.points || 0} pts</span>
          </div>
          <div className="user-avatar">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        {/* Hero Section */}
        <section className="hero-section fade-in">
          <div className="hero-content">
            <h1>
              Welcome back,{" "}
              <span className="highlight">{user?.name?.split(" ")[0]}</span>! 👋
            </h1>
            <p>
              Ready to explore the world of science? Choose an experiment and
              start learning.
            </p>
          </div>

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">⭐</div>
              <div className="stat-info">
                <div className="stat-value">{user?.points || 0}</div>
                <div className="stat-label">Total Points</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🧪</div>
              <div className="stat-info">
                <div className="stat-value">{completedCount}</div>
                <div className="stat-label">Completed</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🏅</div>
              <div className="stat-info">
                <div className="stat-value">{user?.badges?.length || 0}</div>
                <div className="stat-label">Badges</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <div className="stat-value">{progressPercent}%</div>
                <div className="stat-label">Progress</div>
              </div>
            </div>
          </div>
        </section>

        {/* Progress Bar */}
        <section className="progress-section fade-in">
          <div className="progress-header">
            <span>Lab Progress</span>
            <span>
              {completedCount} / {totalExp} experiments
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* Badges Section */}
        {user?.badges?.length > 0 && (
          <section className="badges-section fade-in">
            <h2 className="section-title">🏅 Your Badges</h2>
            <div className="badges-grid">
              {user.badges.map((badge) => (
                <div className="badge-card bounce-in" key={badge}>
                  <span className="badge-icon">
                    {BADGE_INFO[badge]?.icon || "🏆"}
                  </span>
                  <span className="badge-name">{badge}</span>
                  <span className="badge-desc">
                    {BADGE_INFO[badge]?.description}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Experiments Grid */}
        <section className="experiments-section fade-in">
          <h2 className="section-title">🔭 Available Experiments</h2>

          {loading ? (
            <div className="experiments-loading">
              <div className="loading-spinner" />
              <p>Loading experiments...</p>
            </div>
          ) : (
            <div className="experiments-grid">
              {experiments.map((exp) => (
                <div
                  key={exp.id}
                  className={`experiment-card ${exp.completed ? "completed" : ""}`}
                  onClick={() => navigate(`/experiment/${exp.id}`)}
                >
                  <div className="exp-card-header">
                    <span className="exp-icon">{exp.icon}</span>
                    {exp.completed && (
                      <span className="exp-complete-badge">✓ Done</span>
                    )}
                  </div>

                  <h3 className="exp-title">{exp.title}</h3>
                  <p className="exp-description">{exp.description}</p>

                  <div className="exp-meta">
                    <span
                      className="exp-difficulty"
                      style={{ color: DIFFICULTY_COLOR[exp.difficulty] }}
                    >
                      {exp.difficulty}
                    </span>
                    <span className="exp-duration">⏱ {exp.duration}</span>
                    <span className="exp-category">{exp.category}</span>
                  </div>

                  <div className="exp-points">
                    <span>🎯 {exp.completionPoints} pts on completion</span>
                  </div>

                  <button
                    className={`exp-start-btn ${exp.completed ? "btn-redo" : ""}`}
                  >
                    {exp.completed
                      ? "🔄 Redo Experiment"
                      : "▶ Start Experiment"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
