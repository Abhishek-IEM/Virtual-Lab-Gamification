import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import LabRenderer from "../components/LabRenderer";
import AiTutor from "../components/AiTutor";
import "./ExperimentPage.css";

const STEP_TO_EQUIPMENT = {
  "acid-base-neutralization": {
    "add-acid": "acid",
    "add-indicator": "indicator",
    "add-base": "base",
  },
  "simple-circuit": {
    "place-battery": "battery",
    "connect-switch": "switch",
    "connect-bulb": "bulb",
    "close-circuit": "wire",
  },
  "water-distillation": {
    "fill-flask": "flask",
    "setup-condenser": "condenser",
    "heat-water": "burner",
    "collect-distillate": "collector",
  },
};

export default function ExperimentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [experimentComplete, setExperimentComplete] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', message }
  const [points, setPoints] = useState(user?.points || 0);
  const [newBadges, setNewBadges] = useState([]);
  const [showAiTutor, setShowAiTutor] = useState(false);
  const [animating, setAnimating] = useState(null);
  const [pointsDelta, setPointsDelta] = useState(0);
  const [placedComponents, setPlacedComponents] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setExperimentComplete(false);
    setFeedback(null);
    setNewBadges([]);
    setShowAiTutor(false);
    setAnimating(null);
    setPlacedComponents([]);
    fetchExperiment();
  }, [id]);

  const fetchExperiment = async () => {
    try {
      const res = await axios.get(`/experiments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExperiment(res.data.experiment);
    } catch (err) {
      toast.error("Experiment not found");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (stepId) => {
    if (experimentComplete) return;

    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        "/experiments/step",
        {
          experimentId: id,
          stepId,
          currentStepIndex,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data.correct) {
        // Animate the step
        setAnimating(res.data.animation);
        setTimeout(() => setAnimating(null), 1500);

        setFeedback({ type: "success", message: res.data.message });
        setCompletedSteps((prev) => [...prev, stepId]);
        setPoints(res.data.totalPoints);
        setPointsDelta(res.data.pointsEarned || 0);
        setTimeout(() => setPointsDelta(0), 1200);
        updateUser({
          points: res.data.totalPoints,
          experimentsCompleted: res.data.experimentComplete
            ? [...(user.experimentsCompleted || []), id]
            : user.experimentsCompleted,
        });

        if (res.data.badges?.length > (user.badges?.length || 0)) {
          const earned = res.data.badges.filter(
            (b) => !user.badges?.includes(b),
          );
          setNewBadges(earned);
          earned.forEach((b) =>
            toast.success(`🏅 Badge earned: ${b}!`, { duration: 4000 }),
          );
        }

        if (res.data.experimentComplete) {
          setExperimentComplete(true);
        } else {
          setCurrentStepIndex(res.data.nextStepIndex);
        }
        return { correct: true, response: res.data };
      } else {
        setFeedback({ type: "error", message: res.data.message });
        // Shake animation on wrong step
        setTimeout(() => setFeedback(null), 3000);
        return { correct: false, response: res.data };
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process step");
      return { correct: false, response: null };
    }
  };

  const addPlacedComponent = (equipmentId, position) => {
    const equipment = experiment?.equipment?.find(
      (eq) => eq.id === equipmentId,
    );
    setPlacedComponents((prev) => [
      ...prev,
      {
        instanceId: `${equipmentId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        id: equipmentId,
        name: equipment?.name || equipmentId,
        icon: equipment?.icon || "🧩",
        x: position?.x ?? 50,
        y: position?.y ?? 55,
      },
    ]);
  };

  const handleEquipmentDrop = async (equipmentId, position) => {
    if (!experiment || experimentComplete) return;

    const expectedStepId = experiment.steps[currentStepIndex]?.id;
    const expectedEquipmentId = STEP_TO_EQUIPMENT[id]?.[expectedStepId];

    if (!expectedEquipmentId) {
      setFeedback({
        type: "error",
        message: "Use the workspace control for this step.",
      });
      setTimeout(() => setFeedback(null), 2200);
      return;
    }

    if (equipmentId !== expectedEquipmentId) {
      setFeedback({
        type: "error",
        message: `Wrong equipment. Expected: ${expectedEquipmentId}.`,
      });
      setTimeout(() => setFeedback(null), 2200);
      return;
    }

    const result = await handleAction(expectedStepId);
    if (result?.correct) {
      addPlacedComponent(equipmentId, position);
    }
  };

  const handleReset = () => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setExperimentComplete(false);
    setFeedback(null);
    setNewBadges([]);
    setShowAiTutor(false);
    setPlacedComponents([]);
  };

  if (loading) {
    return (
      <div className="experiment-loading">
        <div className="loading-spinner-large" />
        <p>Loading experiment...</p>
      </div>
    );
  }

  if (!experiment) return null;

  const currentStep = experiment.steps[currentStepIndex];
  const expectedEquipmentId = STEP_TO_EQUIPMENT[id]?.[currentStep?.id] || null;
  const totalSteps = experiment.steps.length;
  const progressPercent = Math.round(
    (completedSteps.length / totalSteps) * 100,
  );

  return (
    <div className="experiment-page">
      <div className="experiment-bg-grid" />

      {/* Header */}
      <header className="exp-header">
        <button className="btn-back" onClick={() => navigate("/dashboard")}>
          ← Back
        </button>
        <div className="exp-header-title">
          <span className="exp-header-icon">{experiment.icon}</span>
          <div>
            <h1>{experiment.title}</h1>
            <p>
              {experiment.category} · {experiment.difficulty} ·{" "}
              {experiment.duration}
            </p>
          </div>
        </div>
        <div className="exp-header-points">
          <span className="points-label">⭐ Points</span>
          <span className="points-count">{points}</span>
        </div>
      </header>

      {/* Main Lab Layout */}
      <div className="lab-layout">
        {/* Left: Equipment Shelf */}
        <aside className="lab-equipment-pane">
          <div className="equipment-section">
            <h3>Lab Equipment</h3>
            <p className="equipment-tip">
              Click or drag equipment into the workspace to perform actions.
            </p>
            <div className="equipment-grid">
              {experiment.equipment.map((eq) => (
                <div
                  className={`equipment-item ${expectedEquipmentId === eq.id ? "target" : ""}`}
                  key={eq.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ equipmentId: eq.id, source: "shelf" }),
                    )
                  }
                  onClick={() => handleEquipmentDrop(eq.id, { x: 50, y: 58 })}
                >
                  <span className="eq-icon">{eq.icon}</span>
                  <div className="eq-info">
                    <span className="eq-name">{eq.name}</span>
                    <span className="eq-desc">{eq.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Center: Workspace */}
        <section className="lab-center">
          <div className="lab-viewport">
            <div className="lab-viewport-title">Virtual Lab Workspace</div>

            <LabRenderer
              experimentId={id}
              completedSteps={completedSteps}
              animating={animating}
              currentStepIndex={currentStepIndex}
              experimentComplete={experimentComplete}
              expectedStepId={currentStep?.id}
              expectedEquipmentId={expectedEquipmentId}
              placedComponents={placedComponents}
              feedbackType={feedback?.type}
              onDropEquipment={handleEquipmentDrop}
              onAction={handleAction}
            />

            {/* Feedback Banner */}
            {feedback && (
              <div className={`feedback-banner ${feedback.type} fade-in`}>
                {feedback.type === "success" ? "✅" : "❌"} {feedback.message}
              </div>
            )}

            {pointsDelta > 0 && (
              <div className="points-float">+{pointsDelta} pts</div>
            )}
          </div>
        </section>

        {/* Right: Manual + AI + Progress */}
        <aside className="lab-right">
          <div className="progress-section-card">
            <div className="progress-header-row">
              <span>Experiment Progress</span>
              <span>
                {completedSteps.length}/{totalSteps}
              </span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Theory Card */}
          <div className="theory-card">
            <h3>Lab Manual</h3>
            <p>{experiment.theory}</p>
          </div>

          {/* Step Progress */}
          <div className="steps-overview">
            <h3>Step Guidance</h3>
            <div className="steps-list">
              {experiment.steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`step-item ${
                    completedSteps.includes(step.id)
                      ? "done"
                      : idx === currentStepIndex
                        ? "active"
                        : "pending"
                  }`}
                >
                  <div className="step-number">
                    {completedSteps.includes(step.id) ? "✓" : idx + 1}
                  </div>
                  <div className="step-content">
                    <span className="step-label">{step.label}</span>
                    {idx === currentStepIndex && (
                      <span className="step-description">
                        {step.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!experimentComplete ? (
            <div className="action-panel manual-panel">
              <h3>Current Action</h3>
              <p className="action-hint">
                Current step: <strong>{currentStep?.label}</strong>
              </p>
              <p className="manual-note">
                Interact directly with the lab equipment in the center
                workspace. For liquids, you can drag bottles onto the flask or
                click them.
              </p>
            </div>
          ) : (
            <div className="completion-panel bounce-in">
              <div className="completion-icon">🎉</div>
              <h3>Experiment Complete!</h3>
              <p>
                You successfully completed <strong>{experiment.title}</strong>!
              </p>
              <div className="completion-points">
                +
                {experiment.completionPoints +
                  experiment.steps.length * experiment.stepPoints}{" "}
                points earned
              </div>
              {newBadges.length > 0 && (
                <div className="new-badges">
                  {newBadges.map((b) => (
                    <span key={b} className="new-badge">
                      🏅 {b}
                    </span>
                  ))}
                </div>
              )}
              <div className="completion-actions">
                <button
                  className="btn-dashboard"
                  onClick={() => navigate("/dashboard")}
                >
                  Back to Dashboard
                </button>
                <button className="btn-redo-exp" onClick={handleReset}>
                  🔄 Redo Experiment
                </button>
              </div>
            </div>
          )}

          {/* AI Tutor Section */}
          <div className="ai-section">
            <button
              className="btn-ai-tutor"
              onClick={() => setShowAiTutor(!showAiTutor)}
            >
              🤖 {showAiTutor ? "Hide AI Tutor" : "Ask AI Tutor"}
            </button>

            {showAiTutor && (
              <AiTutor
                experimentId={id}
                currentStepIndex={currentStepIndex}
                stepLabel={currentStep?.label || "Completed"}
              />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
