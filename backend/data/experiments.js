const experiments = [
  {
    id: "acid-base-titration",
    title: "Acid-Base Titration (HCl vs NaOH)",
    category: "Chemistry",
    description:
      "Perform a volumetric titration by neutralizing hydrochloric acid with sodium hydroxide using phenolphthalein as indicator.",
    difficulty: "Intermediate",
    duration: "20 min",
    icon: "⚗️",
    theory:
      "In acid-base titration, a base of known concentration is added to an acid until the equivalence point is reached. For HCl and NaOH: HCl + NaOH -> NaCl + H2O. Phenolphthalein turns from colorless to faint pink at endpoint.",
    aiContext:
      "acid base titration experiment using HCl, NaOH, burette, pipette, indicator and endpoint detection",
    completionPoints: 60,
    stepPoints: 12,
    equipment: [
      {
        id: "pipette",
        name: "Volumetric Pipette",
        icon: "🧪",
        description: "Transfer measured HCl to flask",
      },
      {
        id: "acid",
        name: "HCl Solution",
        icon: "🫧",
        description: "Hydrochloric acid analyte",
      },
      {
        id: "flask",
        name: "Conical Flask",
        icon: "⚗️",
        description: "Reaction vessel",
      },
      {
        id: "indicator-phenolphthalein",
        name: "Phenolphthalein",
        icon: "💧",
        description: "Colorless in acid, pink in base",
      },
      {
        id: "burette",
        name: "Burette",
        icon: "🧫",
        description: "Dispenses NaOH dropwise",
      },
      {
        id: "base",
        name: "NaOH Solution",
        icon: "🧴",
        description: "Sodium hydroxide titrant",
      },
      {
        id: "stand-clamp",
        name: "Lab Stand & Clamp",
        icon: "🗜️",
        description: "Holds burette vertically",
      },
    ],
    steps: [
      {
        id: "pipette-hcl",
        label: "Pipette HCl into Flask",
        description: "Use pipette to add 10 mL HCl into the conical flask",
        animation: "pipette-transfer",
      },
      {
        id: "add-phenolphthalein",
        label: "Add Phenolphthalein",
        description: "Add 2-3 drops of phenolphthalein to the acid sample",
        animation: "indicator-drops",
      },
      {
        id: "titrate-naoh",
        label: "Titrate with NaOH",
        description:
          "Open burette and add NaOH slowly while swirling the flask",
        animation: "burette-drops",
      },
      {
        id: "observe-endpoint",
        label: "Observe Endpoint",
        description: "Stop at first permanent pale pink endpoint",
        animation: "endpoint-color",
      },
    ],
  },
  {
    id: "ph-indicator-testing",
    title: "pH Testing with Indicators",
    category: "Chemistry",
    description:
      "Test solution acidity/basicity using phenolphthalein and methyl orange indicators.",
    difficulty: "Beginner",
    duration: "15 min",
    icon: "🧪",
    theory:
      "Indicators show color over specific pH ranges. Phenolphthalein is colorless below pH 8.2 and pink above pH 8.2. Methyl orange is red in acidic solution and yellow in neutral/basic medium.",
    aiContext:
      "pH indicator testing using phenolphthalein and methyl orange with color interpretation",
    completionPoints: 50,
    stepPoints: 10,
    equipment: [
      {
        id: "test-tube",
        name: "Test Tube",
        icon: "🧫",
        description: "Holds sample solution",
      },
      {
        id: "sample-solution",
        name: "Sample Solution",
        icon: "🫙",
        description: "Unknown pH solution",
      },
      {
        id: "indicator-phenolphthalein",
        name: "Phenolphthalein",
        icon: "💧",
        description: "Primary indicator",
      },
      {
        id: "indicator-methyl-orange",
        name: "Methyl Orange",
        icon: "🟠",
        description: "Secondary indicator",
      },
      {
        id: "dropper",
        name: "Dropper",
        icon: "🧴",
        description: "For adding indicators dropwise",
      },
      {
        id: "ph-meter",
        name: "pH Meter",
        icon: "📊",
        description: "Displays pH from 0 to 14",
      },
    ],
    steps: [
      {
        id: "prepare-sample",
        label: "Prepare Sample",
        description: "Add sample solution to test tube",
        animation: "sample-pour",
      },
      {
        id: "add-phenolphthalein",
        label: "Add Phenolphthalein",
        description: "Add a few drops and observe color response",
        animation: "indicator-drops",
      },
      {
        id: "add-methyl-orange",
        label: "Add Methyl Orange",
        description: "Add methyl orange to a second sample",
        animation: "indicator-drops",
      },
      {
        id: "record-ph",
        label: "Record pH Behavior",
        description: "Interpret indicator colors with pH meter scale",
        animation: "ph-read",
      },
    ],
  },
  {
    id: "precipitation-reaction",
    title: "Precipitation Reaction (AgNO3 + NaCl)",
    category: "Chemistry",
    description:
      "Mix silver nitrate and sodium chloride to observe formation of insoluble silver chloride precipitate.",
    difficulty: "Intermediate",
    duration: "15 min",
    icon: "🧂",
    theory:
      "A precipitation reaction occurs when ions form an insoluble product. AgNO3(aq) + NaCl(aq) -> AgCl(s) + NaNO3(aq). White AgCl precipitate appears immediately.",
    aiContext:
      "precipitation chemistry reaction silver nitrate sodium chloride silver chloride solid formation",
    completionPoints: 55,
    stepPoints: 11,
    equipment: [
      {
        id: "beaker",
        name: "Beaker",
        icon: "🥛",
        description: "Reaction container",
      },
      {
        id: "agno3",
        name: "AgNO3 Solution",
        icon: "⚪",
        description: "Silver nitrate",
      },
      {
        id: "nacl",
        name: "NaCl Solution",
        icon: "🧂",
        description: "Sodium chloride",
      },
      {
        id: "stirrer",
        name: "Glass Rod",
        icon: "🥢",
        description: "Stirs for uniform mixing",
      },
      {
        id: "funnel",
        name: "Funnel",
        icon: "🔻",
        description: "Used for later filtration",
      },
    ],
    steps: [
      {
        id: "pour-agno3",
        label: "Pour AgNO3",
        description: "Add silver nitrate solution to beaker",
        animation: "pour-liquid",
      },
      {
        id: "add-nacl",
        label: "Add NaCl",
        description: "Add sodium chloride solution to initiate reaction",
        animation: "pour-liquid",
      },
      {
        id: "stir-mixture",
        label: "Stir Mixture",
        description: "Stir gently with glass rod",
        animation: "stir",
      },
      {
        id: "observe-agcl",
        label: "Observe AgCl Precipitate",
        description: "Confirm white precipitate formation",
        animation: "precipitate",
      },
    ],
  },
  {
    id: "neutralization-reaction",
    title: "Neutralization Reaction",
    category: "Chemistry",
    description: "Neutralize acid and base and verify near-neutral pH outcome.",
    difficulty: "Beginner",
    duration: "12 min",
    icon: "⚖️",
    theory:
      "Neutralization forms water and salt from acid and base. For equal moles of HCl and NaOH, pH approaches 7 at completion.",
    aiContext:
      "neutralization reaction with acid base pH meter and indicator behavior",
    completionPoints: 50,
    stepPoints: 10,
    equipment: [
      {
        id: "beaker",
        name: "Beaker",
        icon: "🥛",
        description: "Mixing vessel",
      },
      {
        id: "acid",
        name: "HCl Solution",
        icon: "🫧",
        description: "Acid reagent",
      },
      {
        id: "base",
        name: "NaOH Solution",
        icon: "🧴",
        description: "Base reagent",
      },
      {
        id: "stirrer",
        name: "Glass Rod",
        icon: "🥢",
        description: "Stirring tool",
      },
      {
        id: "ph-meter",
        name: "pH Meter",
        icon: "📊",
        description: "Checks final pH",
      },
    ],
    steps: [
      {
        id: "add-acid",
        label: "Add Acid",
        description: "Pour HCl into beaker",
        animation: "pour-liquid",
      },
      {
        id: "add-base",
        label: "Add Base",
        description: "Add NaOH carefully",
        animation: "pour-liquid",
      },
      {
        id: "stir-neutralization",
        label: "Stir Reaction",
        description: "Stir to complete neutralization",
        animation: "stir",
      },
      {
        id: "check-ph-neutral",
        label: "Check pH",
        description: "Verify pH is close to 7",
        animation: "ph-read",
      },
    ],
  },
  {
    id: "filtration-process",
    title: "Filtration of Precipitate",
    category: "Chemistry",
    description:
      "Separate insoluble precipitate from liquid phase using funnel and filter paper.",
    difficulty: "Intermediate",
    duration: "18 min",
    icon: "🔬",
    theory:
      "Filtration separates solids from liquids through porous filter media. Solid residue remains on filter paper while filtrate passes through into receiving flask.",
    aiContext:
      "chemistry filtration process using funnel filter paper and collection flask",
    completionPoints: 55,
    stepPoints: 11,
    equipment: [
      {
        id: "funnel",
        name: "Funnel",
        icon: "🔻",
        description: "Supports filter paper",
      },
      {
        id: "filter-paper",
        name: "Filter Paper",
        icon: "📄",
        description: "Retains precipitate",
      },
      {
        id: "precipitate-mixture",
        name: "Precipitate Mixture",
        icon: "⚪",
        description: "Suspension to separate",
      },
      {
        id: "beaker",
        name: "Beaker",
        icon: "🥛",
        description: "Source container",
      },
      {
        id: "flask",
        name: "Receiving Flask",
        icon: "⚗️",
        description: "Collects filtrate",
      },
    ],
    steps: [
      {
        id: "setup-funnel",
        label: "Set up Funnel",
        description: "Place funnel over receiving flask",
        animation: "setup",
      },
      {
        id: "insert-filter-paper",
        label: "Insert Filter Paper",
        description: "Fold and seat filter paper into funnel",
        animation: "setup",
      },
      {
        id: "pour-mixture",
        label: "Pour Mixture",
        description: "Pour suspension into funnel gradually",
        animation: "pour-liquid",
      },
      {
        id: "collect-filtrate",
        label: "Collect Filtrate",
        description: "Observe clear filtrate and retained residue",
        animation: "filtration",
      },
    ],
  },
  {
    id: "chemical-mixing-reactions",
    title: "Chemical Mixing Reactions",
    category: "Chemistry",
    description:
      "Perform mixing reactions showing color transitions and gas evolution bubbles.",
    difficulty: "Beginner",
    duration: "14 min",
    icon: "🧬",
    theory:
      "Some mixing reactions produce visible signs such as color changes or gas release. Carbonate reacting with acid produces CO2 bubbles: Na2CO3 + 2HCl -> 2NaCl + H2O + CO2(g).",
    aiContext:
      "basic chemistry mixing reaction with color change and gas evolution bubbles",
    completionPoints: 50,
    stepPoints: 10,
    equipment: [
      {
        id: "test-tube",
        name: "Test Tube",
        icon: "🧫",
        description: "Reaction tube",
      },
      {
        id: "reagent-a",
        name: "Reagent A",
        icon: "🔵",
        description: "Color precursor",
      },
      {
        id: "reagent-b",
        name: "Reagent B",
        icon: "🟡",
        description: "Color modifier",
      },
      {
        id: "carbonate",
        name: "Sodium Carbonate",
        icon: "⚪",
        description: "Gas-forming reactant",
      },
      {
        id: "acid",
        name: "HCl Solution",
        icon: "🫧",
        description: "Acid for gas evolution",
      },
      {
        id: "dropper",
        name: "Dropper",
        icon: "🧴",
        description: "Controlled addition",
      },
    ],
    steps: [
      {
        id: "add-reagent-a",
        label: "Add Reagent A",
        description: "Add first reagent into test tube",
        animation: "pour-liquid",
      },
      {
        id: "add-reagent-b",
        label: "Add Reagent B",
        description: "Add second reagent and observe color blending",
        animation: "color-change",
      },
      {
        id: "add-carbonate",
        label: "Add Carbonate",
        description: "Introduce carbonate before acid",
        animation: "add-solid",
      },
      {
        id: "add-acid-gas",
        label: "Add Acid and Observe Gas",
        description: "Add acid dropwise and observe CO2 bubbles",
        animation: "gas-evolution",
      },
    ],
  },
];

module.exports = experiments;
