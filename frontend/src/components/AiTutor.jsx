import { useMemo, useRef, useState } from "react";
import "./AiTutor.css";

function makeReply({
  text,
  experimentTitle,
  currentStepLabel,
  currentStepDescription,
  educationalExplanation,
  currentStepIndex,
  totalSteps,
  experimentComplete,
}) {
  const q = text.toLowerCase();

  if (experimentComplete) {
    return `You have completed ${experimentTitle}. Review your observations and compare them with expected outcomes in the lab manual.`;
  }

  if (q.includes("what is this") || q.includes("experiment")) {
    return `${experimentTitle} demonstrates core lab concepts through guided steps. Focus on safety, sequence, and observations at each stage.`;
  }

  if (q.includes("next") || q.includes("step")) {
    return `Next step: ${currentStepLabel || "Follow the highlighted step"}. ${currentStepDescription || "Proceed in order and verify changes in the workspace."}`;
  }

  if (q.includes("reaction") || q.includes("explain")) {
    return educationalExplanation
      ? educationalExplanation
      : "Observe changes in color, clarity, or precipitate and relate them to reagent interactions in the current step.";
  }

  return `You are on step ${Math.min(currentStepIndex + 1, totalSteps)}/${totalSteps}. ${currentStepLabel || "Continue with the current highlighted action"}.`;
}

export default function AiTutor({
  experimentTitle,
  experimentId,
  currentStepIndex,
  totalSteps,
  currentStepLabel,
  currentStepDescription,
  educationalExplanation,
  experimentComplete,
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      text: "I am your AI Tutor. Ask for the next step, reaction explanation, or experiment goal.",
    },
  ]);
  const chatBodyRef = useRef(null);

  const suggestions = useMemo(
    () => ["What is this experiment?", "Next step?", "Explain reaction"],
    [],
  );

  const appendConversation = (prompt) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const aiText = makeReply({
      text: trimmed,
      experimentTitle,
      currentStepLabel,
      currentStepDescription,
      educationalExplanation,
      currentStepIndex,
      totalSteps,
      experimentComplete,
    });

    setMessages((prev) => [
      ...prev,
      { role: "user", text: trimmed },
      { role: "ai", text: aiText },
    ]);

    requestAnimationFrame(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }
    });
  };

  const onSend = () => {
    appendConversation(input);
    setInput("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <section className="ai-tutor-card" aria-label="AI Tutor">
      <div className="ai-tutor-head">
        <div className="ai-dot" aria-hidden="true" />
        <div>
          <p className="ai-tutor-title">AI Tutor</p>
          <p className="ai-tutor-subtitle">Context-aware lab help</p>
        </div>
      </div>

      <div className="ai-chip-row">
        {suggestions.map((label) => (
          <button
            key={label}
            type="button"
            className="ai-chip"
            onClick={() => appendConversation(label)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ai-chat-body" ref={chatBodyRef}>
        {messages.map((msg, idx) => (
          <div
            key={`${msg.role}-${idx}`}
            className={`ai-bubble ${msg.role === "user" ? "is-user" : "is-ai"}`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="ai-input-row">
        <input
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask AI Tutor..."
          aria-label={`Ask AI Tutor about ${experimentTitle || experimentId}`}
        />
        <button type="button" className="ai-send" onClick={onSend}>
          Send
        </button>
      </div>

      <p className="ai-step-hint">
        Step {Math.min(currentStepIndex + 1, totalSteps)}/{totalSteps}:{" "}
        {currentStepLabel || "Ready"}
      </p>
    </section>
  );
}
