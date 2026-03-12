import { useState } from "react";
import axios from "axios";
import "./AiTutor.css";

export default function AiTutor({ experimentId, currentStepIndex, stepLabel }) {
  const [guidance, setGuidance] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const askTutor = async () => {
    setLoading(true);
    setGuidance("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/ai/help",
        {
          experimentId,
          currentStepIndex,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setGuidance(res.data.guidance);
      setAsked(true);
    } catch (err) {
      setGuidance("AI Tutor is currently unavailable. Please try again later.");
      setAsked(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-tutor-panel fade-in">
      <div className="ai-tutor-header">
        <div className="ai-avatar">🤖</div>
        <div className="ai-info">
          <span className="ai-name">AI Science Tutor</span>
          <span className="ai-status">Powered by Gemini AI</span>
        </div>
      </div>

      <div className="ai-current-step">
        <span className="step-badge">Current Step:</span>
        <span className="step-name">{stepLabel}</span>
      </div>

      {!asked && !loading && (
        <div className="ai-prompt-area">
          <p className="ai-intro">
            Need help with this step? Ask your AI tutor for a detailed
            explanation and guidance!
          </p>
          <button className="btn-ask-now" onClick={askTutor}>
            💬 Ask AI for Guidance
          </button>
        </div>
      )}

      {loading && (
        <div className="ai-loading">
          <div className="ai-thinking">
            <span className="dot d1" />
            <span className="dot d2" />
            <span className="dot d3" />
          </div>
          <p>AI Tutor is thinking...</p>
        </div>
      )}

      {asked && !loading && guidance && (
        <div className="ai-response">
          <div className="ai-response-text">{guidance}</div>
          <button className="btn-ask-again" onClick={askTutor}>
            🔄 Ask Again
          </button>
        </div>
      )}
    </div>
  );
}
