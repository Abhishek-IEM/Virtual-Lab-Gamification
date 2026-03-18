import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import LabRenderer from "../components/LabRenderer";
import AiTutor from "../components/AiTutor";
import "./ExperimentPage.css";

const RUN_HISTORY_KEY = "chemistry-lab-run-history-v1";

const STEP_TO_EQUIPMENT = {
  "acid-base-titration": {
    "pipette-hcl": "pipette",
    "add-phenolphthalein": "indicator-phenolphthalein",
    "titrate-naoh": "burette",
    "observe-endpoint": "flask",
  },
  "ph-indicator-testing": {
    "prepare-sample": "sample-solution",
    "add-phenolphthalein": "indicator-phenolphthalein",
    "add-methyl-orange": "indicator-methyl-orange",
    "record-ph": "ph-meter",
  },
  "precipitation-reaction": {
    "pour-agno3": "agno3",
    "add-nacl": "nacl",
    "stir-mixture": "stirrer",
    "observe-agcl": "beaker",
  },
  "neutralization-reaction": {
    "add-acid": "acid",
    "add-base": "base",
    "stir-neutralization": "stirrer",
    "check-ph-neutral": "ph-meter",
  },
  "filtration-process": {
    "setup-funnel": "funnel",
    "insert-filter-paper": "filter-paper",
    "pour-mixture": "precipitate-mixture",
    "collect-filtrate": "flask",
  },
  "chemical-mixing-reactions": {
    "add-reagent-a": "reagent-a",
    "add-reagent-b": "reagent-b",
    "add-carbonate": "carbonate",
    "add-acid-gas": "acid",
  },
};

const STEP_EXPLANATIONS = {
  "acid-base-titration": {
    "pipette-hcl":
      "Use volumetric transfer to keep acid volume accurate before titration.",
    "add-phenolphthalein":
      "Phenolphthalein stays colorless in acidic media and turns pink near endpoint.",
    "titrate-naoh":
      "NaOH is added gradually to avoid overshooting the equivalence point.",
    "observe-endpoint":
      "A faint permanent pink indicates slight excess base and a completed titration endpoint.",
  },
  "ph-indicator-testing": {
    "prepare-sample":
      "Prepare a clean sample so indicator response is not contaminated.",
    "add-phenolphthalein":
      "Phenolphthalein transitions around pH 8.2 to 10 and helps detect basic conditions.",
    "add-methyl-orange":
      "Methyl orange is red in acidic range and yellow near neutral/basic range.",
    "record-ph":
      "Cross-check observed colors with the pH scale from 0 to 14 for interpretation.",
  },
  "precipitation-reaction": {
    "pour-agno3":
      "Silver ions must be in solution before chloride is introduced.",
    "add-nacl":
      "Ag+ reacts with Cl- to form insoluble AgCl as a white precipitate.",
    "stir-mixture":
      "Gentle stirring increases contact between ions for complete precipitation.",
    "observe-agcl":
      "A cloudy white solid confirms precipitation reaction completion.",
  },
  "neutralization-reaction": {
    "add-acid": "Establish acidic starting condition before neutralization.",
    "add-base":
      "Base is introduced to consume H+ ions and move pH toward neutral.",
    "stir-neutralization":
      "Stirring ensures homogeneous reaction and stable pH reading.",
    "check-ph-neutral": "Final pH near 7 confirms successful neutralization.",
  },
  "filtration-process": {
    "setup-funnel":
      "A stable funnel setup prevents loss of mixture during transfer.",
    "insert-filter-paper":
      "Filter paper acts as porous barrier to retain precipitate.",
    "pour-mixture": "Pour slowly to avoid tearing filter paper and overflow.",
    "collect-filtrate":
      "Clear filtrate indicates effective separation of solid residue.",
  },
  "chemical-mixing-reactions": {
    "add-reagent-a":
      "First reagent establishes the base composition of the mixture.",
    "add-reagent-b":
      "Second reagent can shift complexes and produce visible color transitions.",
    "add-carbonate":
      "Carbonate serves as precursor for gas evolution with acid.",
    "add-acid-gas": "Acid reacts with carbonate to release CO2 bubbles.",
  },
};

const EQUIPMENT_MISUSE_HINTS = {
  acid: "Acid must be used in controlled steps to avoid unsafe or invalid sequence.",
  base: "Base addition is step-sensitive because it changes pH rapidly.",
  burette: "Burette is reserved for controlled titrant delivery.",
  "ph-meter": "Use the pH meter only when solution is ready for measurement.",
  funnel: "Funnel is used only in filtration setup stages.",
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
  const [animating, setAnimating] = useState(null);
  const [pointsDelta, setPointsDelta] = useState(0);
  const [placedComponents, setPlacedComponents] = useState([]);
  const [educationalMode, setEducationalMode] = useState(true);
  const [savedRuns, setSavedRuns] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [selectionSnackbar, setSelectionSnackbar] = useState("");
  const [placementFeedback, setPlacementFeedback] = useState(null);
  const demoStepOneAutoplayDoneRef = useRef(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    setCurrentStepIndex(0);
    setCompletedSteps([]);
    setExperimentComplete(false);
    setFeedback(null);
    setNewBadges([]);
    setAnimating(null);
    setPlacedComponents([]);
    setSelectedEquipmentId(null);
    setSelectionSnackbar("");
    setPlacementFeedback(null);
    demoStepOneAutoplayDoneRef.current = false;
    fetchExperiment();
  }, [id]);

  useEffect(() => {
    if (!experiment || experimentComplete) return;
    if (demoStepOneAutoplayDoneRef.current) return;
    if (currentStepIndex !== 0) return;
    if (completedSteps.length > 0) return;

    const firstStepId = experiment.steps?.[0]?.id;
    if (!firstStepId) return;

    demoStepOneAutoplayDoneRef.current = true;
    const timer = setTimeout(() => {
      handleAction(firstStepId);
    }, 3000);

    return () => clearTimeout(timer);
  }, [experiment, experimentComplete, currentStepIndex, completedSteps.length]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RUN_HISTORY_KEY);
      if (!raw) {
        setSavedRuns([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const runs = Array.isArray(parsed?.[id]) ? parsed[id] : [];
      setSavedRuns(runs);
    } catch {
      setSavedRuns([]);
    }
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
          const runEntry = {
            experimentId: id,
            experimentTitle: experiment?.title,
            completedAt: new Date().toISOString(),
            totalPoints: res.data.totalPoints,
            pointsEarned:
              experiment?.completionPoints +
              (experiment?.steps?.length || 0) * (experiment?.stepPoints || 0),
            stepsCompleted:
              experiment?.steps?.length || completedSteps.length + 1,
          };
          try {
            const raw = localStorage.getItem(RUN_HISTORY_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            const existing = Array.isArray(parsed[id]) ? parsed[id] : [];
            const updated = [runEntry, ...existing].slice(0, 8);
            const next = { ...parsed, [id]: updated };
            localStorage.setItem(RUN_HISTORY_KEY, JSON.stringify(next));
            setSavedRuns(updated);
          } catch {
            // Ignore local persistence failure.
          }
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

    setPlacementFeedback({
      id: `${equipmentId}-${Date.now()}`,
      icon: equipment?.icon || "🧩",
      name: equipment?.name || equipmentId,
    });
    setTimeout(() => setPlacementFeedback(null), 340);
  };

  const handleSelectEquipment = (equipmentId) => {
    const equipment = experiment?.equipment?.find(
      (eq) => eq.id === equipmentId,
    );
    setSelectedEquipmentId(equipmentId);
    setSelectionSnackbar(
      `${equipment?.name || equipmentId} selected — click workspace to place`,
    );
  };

  const handleWorkspaceClickToPlace = async () => {
    if (!selectedEquipmentId) return;
    await handleEquipmentDrop(selectedEquipmentId, { x: 50, y: 58 });
    setSelectedEquipmentId(null);
    setSelectionSnackbar("");
  };

  const handleEquipmentDrop = async (equipmentId, position) => {
    if (!experiment || experimentComplete) return;

    const expectedStepId = experiment.steps[currentStepIndex]?.id;
    const expectedEquipmentId = STEP_TO_EQUIPMENT[id]?.[expectedStepId];

    if (!expectedEquipmentId) {
      setFeedback({
        type: "error",
        message:
          "This step is observation-driven. Follow the current step instruction in the guidance panel.",
      });
      setTimeout(() => setFeedback(null), 2200);
      return;
    }

    if (equipmentId !== expectedEquipmentId) {
      const expectedEq = experiment?.equipment?.find(
        (eq) => eq.id === expectedEquipmentId,
      );
      const usedEq = experiment?.equipment?.find((eq) => eq.id === equipmentId);
      const hint = EQUIPMENT_MISUSE_HINTS[equipmentId]
        ? ` ${EQUIPMENT_MISUSE_HINTS[equipmentId]}`
        : "";
      setFeedback({
        type: "error",
        message: `Wrong equipment: ${usedEq?.name || equipmentId}. Use ${expectedEq?.name || expectedEquipmentId} for this step.${hint}`,
      });
      setTimeout(() => setFeedback(null), 3200);
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
  const educationalExplanation = educationalMode
    ? STEP_EXPLANATIONS[id]?.[currentStep?.id]
    : null;

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
        <button
          className={`btn-edu-mode ${educationalMode ? "on" : "off"}`}
          onClick={() => setEducationalMode((prev) => !prev)}
        >
          {educationalMode
            ? "📘 Educational Mode: ON"
            : "📘 Educational Mode: OFF"}
        </button>
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
                  className={`equipment-item ${expectedEquipmentId === eq.id ? "target" : ""} ${selectedEquipmentId === eq.id ? "selected" : ""}`}
                  key={eq.id}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData(
                      "application/json",
                      JSON.stringify({ equipmentId: eq.id, source: "shelf" }),
                    )
                  }
                  onClick={() => handleSelectEquipment(eq.id)}
                >
                  <span className="eq-icon-shell">
                    <span className="eq-icon">{eq.icon}</span>
                  </span>
                  <div className="eq-info">
                    <span className="eq-name">{eq.name}</span>
                    <span className="eq-desc">{eq.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="theory-card lab-manual-left">
            <h3>Lab Manual</h3>
            <p>{experiment.theory}</p>
          </div>
        </aside>

        {/* Center: Workspace */}
        <section className="lab-center">
          <div className="lab-viewport" onClick={handleWorkspaceClickToPlace}>
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
          </div>
        </section>

        {/* Right: Guidance + Progress */}
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
                        : idx <= currentStepIndex
                          ? "unlocked"
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

          <AiTutor
            experimentTitle={experiment.title}
            experimentId={id}
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            currentStepLabel={currentStep?.label}
            currentStepDescription={currentStep?.description}
            educationalExplanation={educationalExplanation}
            experimentComplete={experimentComplete}
          />
        </aside>
      </div>
    </div>
  );
}
