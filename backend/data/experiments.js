const experiments = [
  {
    id: "acid-base-neutralization",
    title: "Acid Base Neutralization",
    category: "Chemistry",
    description:
      "Explore how acids and bases react to form neutral solutions using indicators to track the pH changes.",
    difficulty: "Beginner",
    duration: "15 min",
    icon: "⚗️",
    theory:
      "Acid-base neutralization is a chemical reaction in which an acid and a base react to form water and a salt. The pH indicator changes color based on the pH of the solution.",
    aiContext:
      "acid base neutralization chemistry experiment where students add acid to a flask, add an indicator to detect pH, then add base to neutralize the acid and observe color change",
    completionPoints: 50,
    stepPoints: 10,
    equipment: [
      {
        id: "flask",
        name: "Erlenmeyer Flask",
        icon: "🧪",
        description: "Glass flask to hold the reaction",
      },
      {
        id: "acid",
        name: "Acid Bottle (HCl)",
        icon: "🫧",
        description: "Hydrochloric acid solution",
      },
      {
        id: "base",
        name: "Base Bottle (NaOH)",
        icon: "🧴",
        description: "Sodium hydroxide solution",
      },
      {
        id: "indicator",
        name: "Phenolphthalein",
        icon: "💧",
        description: "pH indicator that turns pink in base",
      },
      {
        id: "stirrer",
        name: "Glass Stirrer",
        icon: "🥢",
        description: "For mixing the solution",
      },
    ],
    steps: [
      {
        id: "add-acid",
        label: "Add Acid",
        description:
          "Pour 10 mL of hydrochloric acid (HCl) into the Erlenmeyer flask",
        animation: "pour-acid",
      },
      {
        id: "add-indicator",
        label: "Add Indicator",
        description:
          "Add 3 drops of phenolphthalein indicator to the acid in the flask",
        animation: "add-drops",
      },
      {
        id: "add-base",
        label: "Add Base",
        description:
          "Slowly add sodium hydroxide (NaOH) solution drop by drop while stirring",
        animation: "pour-base",
      },
      {
        id: "observe-result",
        label: "Observe Color Change",
        description:
          "Watch the solution turn pink as the acid becomes neutralized by the base",
        animation: "color-change",
      },
    ],
  },
  {
    id: "simple-circuit",
    title: "Simple Circuit Experiment",
    category: "Physics",
    description:
      "Build a basic electrical circuit with a battery, wires, bulb, and switch to understand current flow.",
    difficulty: "Beginner",
    duration: "10 min",
    icon: "⚡",
    theory:
      "An electric circuit is a path through which electric current flows. A complete circuit requires a power source, conducting wires, and a load (such as a bulb). A switch can open or close the circuit.",
    aiContext:
      "simple electric circuit experiment where students connect a battery, wire, switch, and bulb to understand current, voltage, and circuit completion",
    completionPoints: 50,
    stepPoints: 10,
    equipment: [
      {
        id: "battery",
        name: "9V Battery",
        icon: "🔋",
        description: "Power source for the circuit",
      },
      {
        id: "wire",
        name: "Copper Wires",
        icon: "〰️",
        description: "Conductors to connect components",
      },
      {
        id: "bulb",
        name: "Light Bulb",
        icon: "💡",
        description: "Load that lights when current flows",
      },
      {
        id: "switch",
        name: "Toggle Switch",
        icon: "🔌",
        description: "Turns the circuit on or off",
      },
      {
        id: "breadboard",
        name: "Breadboard",
        icon: "🟫",
        description: "Base for assembling the circuit",
      },
    ],
    steps: [
      {
        id: "place-battery",
        label: "Place Battery",
        description:
          "Place the 9V battery on the breadboard and note the positive (+) and negative (-) terminals",
        animation: "place-component",
      },
      {
        id: "connect-switch",
        label: "Connect Switch",
        description:
          "Connect the switch in series from the positive terminal of the battery",
        animation: "connect-wire",
      },
      {
        id: "connect-bulb",
        label: "Connect Bulb",
        description:
          "Connect the light bulb from the switch to complete one side of the circuit",
        animation: "place-component",
      },
      {
        id: "close-circuit",
        label: "Close Circuit",
        description:
          "Connect the remaining wire from the bulb back to the negative terminal of the battery",
        animation: "connect-wire",
      },
      {
        id: "flip-switch",
        label: "Flip the Switch",
        description:
          "Toggle the switch to ON position and observe the bulb light up",
        animation: "flip-switch",
      },
    ],
  },
  {
    id: "water-distillation",
    title: "Water Distillation",
    category: "Chemistry",
    description:
      "Purify water through evaporation and condensation to understand the distillation process.",
    difficulty: "Intermediate",
    duration: "20 min",
    icon: "💧",
    theory:
      "Distillation is a process of separating mixtures based on differences in volatility of components in a boiling liquid mixture. Water evaporates, travels through a condenser, and is collected as purified water.",
    aiContext:
      "water distillation experiment where students heat impure water, collect steam through a condenser, and gather purified distilled water",
    completionPoints: 50,
    stepPoints: 10,
    equipment: [
      {
        id: "flask",
        name: "Round-bottom Flask",
        icon: "🫙",
        description: "Holds the water being heated",
      },
      {
        id: "burner",
        name: "Bunsen Burner",
        icon: "🔥",
        description: "Heat source for boiling the water",
      },
      {
        id: "condenser",
        name: "Liebig Condenser",
        icon: "🌡️",
        description: "Cools steam back into liquid",
      },
      {
        id: "collector",
        name: "Collection Flask",
        icon: "🧪",
        description: "Collects the purified distilled water",
      },
      {
        id: "thermometer",
        name: "Thermometer",
        icon: "🌡️",
        description: "Monitors the temperature of the vapor",
      },
    ],
    steps: [
      {
        id: "fill-flask",
        label: "Fill Flask with Water",
        description:
          "Pour impure water sample into the round-bottom flask (fill to 2/3 capacity)",
        animation: "pour-liquid",
      },
      {
        id: "setup-condenser",
        label: "Setup Condenser",
        description:
          "Attach the Liebig condenser at an angle and connect cooling water tubes",
        animation: "connect-equipment",
      },
      {
        id: "heat-water",
        label: "Heat the Water",
        description:
          "Light the Bunsen burner and heat the water until it begins to boil and produce steam",
        animation: "heat-on",
      },
      {
        id: "collect-distillate",
        label: "Collect Distillate",
        description:
          "Position the collection flask at the end of the condenser to collect the purified water",
        animation: "collect-liquid",
      },
      {
        id: "observe-result",
        label: "Observe Pure Water",
        description:
          "Compare the collected distilled water with the original impure sample",
        animation: "compare",
      },
    ],
  },
];

module.exports = experiments;
