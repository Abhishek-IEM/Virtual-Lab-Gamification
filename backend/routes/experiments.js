const express = require("express");
const authenticate = require("../middleware/auth");
const experimentsData = require("../data/experiments");
const User = require("../models/User");

const router = express.Router();

// GET /experiments — list all experiments
router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const experiments = experimentsData.map((exp) => ({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      description: exp.description,
      difficulty: exp.difficulty,
      duration: exp.duration,
      icon: exp.icon,
      completionPoints: exp.completionPoints,
      completed: user.experimentsCompleted.includes(exp.id),
    }));
    res.json({ experiments });
  } catch (err) {
    console.error("Get experiments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /experiments/:id — get single experiment with steps
router.get("/:id", authenticate, async (req, res) => {
  try {
    const experiment = experimentsData.find((e) => e.id === req.params.id);
    if (!experiment) {
      return res.status(404).json({ message: "Experiment not found" });
    }
    const completed = req.user.experimentsCompleted.includes(experiment.id);
    res.json({ experiment: { ...experiment, completed } });
  } catch (err) {
    console.error("Get experiment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /experiments/step — validate a step and award points
router.post("/step", authenticate, async (req, res) => {
  try {
    const { experimentId, stepId, currentStepIndex } = req.body;

    const experiment = experimentsData.find((e) => e.id === experimentId);
    if (!experiment) {
      return res.status(404).json({ message: "Experiment not found" });
    }

    const expectedStep = experiment.steps[currentStepIndex];
    if (!expectedStep) {
      return res.status(400).json({ message: "Invalid step index" });
    }

    const isCorrect = expectedStep.id === stepId;

    if (!isCorrect) {
      return res.json({
        correct: false,
        message: `Wrong step! You should: "${expectedStep.label}" first.`,
        expectedStep: expectedStep.label,
      });
    }

    // Award step points
    const user = await User.findById(req.user._id);
    user.points += experiment.stepPoints;

    const isLastStep = currentStepIndex === experiment.steps.length - 1;
    let completionBonus = 0;

    if (isLastStep && !user.experimentsCompleted.includes(experimentId)) {
      user.experimentsCompleted.push(experimentId);
      completionBonus = experiment.completionPoints;
      user.points += completionBonus;

      // Award badges
      if (
        user.experimentsCompleted.length === 1 &&
        !user.badges.includes("First Experiment")
      ) {
        user.badges.push("First Experiment");
      }
      if (
        user.experimentsCompleted.length >= 2 &&
        !user.badges.includes("Lab Beginner")
      ) {
        user.badges.push("Lab Beginner");
      }
      const chemistryExps = ["acid-base-neutralization", "water-distillation"];
      const completedChem = chemistryExps.filter((id) =>
        user.experimentsCompleted.includes(id),
      );
      if (
        completedChem.length >= 2 &&
        !user.badges.includes("Chemistry Explorer")
      ) {
        user.badges.push("Chemistry Explorer");
      }
    }

    await user.save();

    res.json({
      correct: true,
      message: isLastStep
        ? `Experiment complete! You earned ${experiment.stepPoints + completionBonus} points!`
        : `Correct! +${experiment.stepPoints} points`,
      pointsEarned: experiment.stepPoints + completionBonus,
      stepPoints: experiment.stepPoints,
      completionBonus,
      experimentComplete: isLastStep,
      totalPoints: user.points,
      badges: user.badges,
      nextStepIndex: isLastStep ? null : currentStepIndex + 1,
      animation: expectedStep.animation,
    });
  } catch (err) {
    console.error("Step validation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
