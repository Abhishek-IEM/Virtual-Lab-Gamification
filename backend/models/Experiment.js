const mongoose = require("mongoose");

const stepSchema = new mongoose.Schema(
  {
    id: String,
    label: String,
    description: String,
    animation: String,
  },
  { _id: false },
);

const equipmentSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    icon: String,
    description: String,
  },
  { _id: false },
);

const experimentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    category: String,
    description: String,
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    duration: String,
    icon: String,
    steps: [stepSchema],
    equipment: [equipmentSchema],
    completionPoints: {
      type: Number,
      default: 50,
    },
    stepPoints: {
      type: Number,
      default: 10,
    },
    theory: String,
    aiContext: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Experiment", experimentSchema);
