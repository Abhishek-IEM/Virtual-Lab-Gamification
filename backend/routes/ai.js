const express = require("express");
const authenticate = require("../middleware/auth");
const experimentsData = require("../data/experiments");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

// POST /ai/help — get AI tutor guidance for current experiment step
router.post("/help", authenticate, async (req, res) => {
  try {
    const { experimentId, currentStepIndex } = req.body;

    const experiment = experimentsData.find((e) => e.id === experimentId);
    if (!experiment) {
      return res.status(404).json({ message: "Experiment not found" });
    }

    const currentStep = experiment.steps[currentStepIndex];
    if (!currentStep) {
      return res.status(400).json({ message: "Invalid step" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_gemini_api_key_here") {
      // Return a helpful fallback when no API key is configured
      return res.json({
        guidance: getFallbackGuidance(
          experiment,
          currentStep,
          currentStepIndex,
        ),
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are an AI science tutor helping a student perform a virtual lab experiment.

Experiment: ${experiment.title}
Context: ${experiment.aiContext}
Theory: ${experiment.theory}

The student is on Step ${currentStepIndex + 1} of ${experiment.steps.length}: "${currentStep.label}"
Step description: ${currentStep.description}

Provide helpful, encouraging guidance for this step. Explain:
1. What exactly the student should do in this step
2. Why this step is important in the experiment
3. What to observe or expect after this step
4. Any safety tips if relevant

Keep your response concise (3-4 sentences), friendly, and educational. Use simple language suitable for a student.`;

    const result = await model.generateContent(prompt);
    const guidance = result.response.text();

    res.json({ guidance });
  } catch (err) {
    console.error("AI help error:", err);
    // Return fallback guidance on error
    const experiment = experimentsData.find(
      (e) => e.id === req.body.experimentId,
    );
    const currentStep = experiment?.steps[req.body.currentStepIndex];
    if (experiment && currentStep) {
      return res.json({
        guidance: getFallbackGuidance(
          experiment,
          currentStep,
          req.body.currentStepIndex,
        ),
      });
    }
    res.status(500).json({ message: "AI service unavailable" });
  }
});

function getFallbackGuidance(experiment, step, stepIndex) {
  const guidanceMap = {
    "add-acid":
      "Carefully pour the hydrochloric acid (HCl) into the flask. Acid is the reactant that provides H⁺ ions. Always handle acids with care and use protective equipment. The solution will appear clear at this stage.",
    "add-indicator":
      "Add a few drops of phenolphthalein indicator to the acid solution. This indicator is colorless in acidic conditions and turns pink/magenta in basic conditions. This will help you visually track when neutralization has occurred.",
    "add-base":
      "Slowly add sodium hydroxide (NaOH) drop by drop while stirring continuously. The base provides OH⁻ ions that react with H⁺ ions from the acid. Watch closely as the solution begins to change color!",
    "observe-result":
      "Observe the permanent pink color change — this is the equivalence point where acid perfectly neutralizes the base. The reaction is: HCl + NaOH → NaCl + H₂O. Congratulations on completing the neutralization!",
    "place-battery":
      "Place the 9V battery securely on the breadboard. The positive (+) terminal is the longer prong and negative (-) is shorter. This is your power source that drives electrons through the circuit.",
    "connect-switch":
      "Connect a wire from the positive terminal to one end of the switch. The switch controls whether the circuit is open (no current) or closed (current flows). This is the control element of your circuit.",
    "connect-bulb":
      "Connect the light bulb from the other switch terminal. The bulb is the load — it converts electrical energy into light and heat. Make sure the bulb connections are secure.",
    "close-circuit":
      "Connect the final wire from the bulb back to the negative battery terminal. This completes the circuit loop! Electrons can now flow from negative through the circuit back to positive.",
    "flip-switch":
      "Toggle the switch to the ON position. When the circuit is closed, current flows and the bulb lights up! Ohm's Law: V = IR explains the relationship between voltage, current, and resistance.",
    "fill-flask":
      "Fill the round-bottom flask about 2/3 full with the impure water sample. Never fill it completely — you need space for boiling. Notice the impurities visible in the water before distillation.",
    "setup-condenser":
      "Attach the condenser at a downward angle so condensed steam flows into the collection flask. The condenser uses cooling water to turn steam back into liquid water. Proper setup is crucial for efficient distillation.",
    "heat-water":
      "Apply gentle heat from the Bunsen burner. Watch the temperature rise to 100°C (water's boiling point). Steam rises into the condenser while dissolved impurities remain in the flask.",
    "collect-distillate":
      "Position the collection flask at the condenser exit. The steam has cooled back into pure liquid water. The distillate is pure H₂O because impurities have higher boiling points and stay behind.",
    "observe-result":
      "Compare your distilled water (crystal clear) with the original impure sample. Distillation separates substances by boiling point differences. This same principle is used to purify water and make medicines!",
  };

  return (
    guidanceMap[step.id] ||
    `For step "${step.label}": ${step.description}. Follow the instructions carefully and observe any changes that occur. Each step is important for the success of the experiment!`
  );
}

module.exports = router;
