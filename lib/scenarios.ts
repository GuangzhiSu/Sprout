export type ScenarioNpc = {
  id: string;
  name: string;
  ageRange: string;
  personality: string;
  currentGoal: string;
  currentActivity: string;
  relationship: string;
  proactiveByDifficulty: Record<1 | 2 | 3 | 4, string>;
};

export type ScenarioDifficulty = {
  level: 1 | 2 | 3 | 4;
  name: string;
  npcInitiative: string;
  conversationTurns: number;
  ambiguity: string;
  openingSpeaker: string;
  openingReply: string;
  openingCoachNote: string;
};

export type ScenarioDefinition = {
  id: string;
  sequenceLabel: string;
  title: string;
  sceneAriaLabel: string;
  image: { src: string; alt: string };
  backgroundAudio?: { src: string; volume: number };
  npcs: ScenarioNpc[];
  difficulties: ScenarioDifficulty[];
  opening: { coachNote: string; peerLabel: string; peerReply: string };
  fallback: { coachNote: string; peerReply: string };
  modelContext: { scene: string; goal: string; safety: string };
};

export const playgroundScenario: ScenarioDefinition = {
  id: "playground",
  sequenceLabel: "Scenario 01",
  title: "Join play at the playground",
  sceneAriaLabel: "Playground communication practice",
  image: {
    src: "/playground-scene.png",
    alt: "A sunny playground where Mia and Jordan build a castle with large blocks",
  },
  backgroundAudio: { src: "/audio/freesound_community-playground-7156.mp3", volume: 0.8 },
  npcs: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "8–10",
      personality: "Friendly, direct, and happy to include someone new.",
      currentGoal: "Finish the castle gate while keeping the play moving.",
      currentActivity: "Building a castle from large playground blocks.",
      relationship: "Jordan’s friend and building partner.",
      proactiveByDifficulty: {
        1: "Invites the child directly and asks one clear question at a time.",
        2: "Says hello and leaves a clear opening for the child to respond.",
        3: "Keeps building until the child initiates, then responds warmly.",
        4: "Responds naturally but does not solve ambiguity or an unexpected event for the child.",
      },
    },
    {
      id: "jordan",
      name: "Jordan",
      ageRange: "8–10",
      personality: "Quiet, focused on the blocks, and sometimes slow to notice a new speaker.",
      currentGoal: "Make the tallest tower without it falling.",
      currentActivity: "Sorting blocks and testing the castle tower.",
      relationship: "Mia’s friend and building partner.",
      proactiveByDifficulty: {
        1: "Waits while Mia leads and gives short, friendly replies.",
        2: "Answers simple questions after Mia opens the conversation.",
        3: "May be distracted and ask for a natural clarification.",
        4: "Introduces mild ambiguity, a changed plan, or a limited role in the game.",
      },
    },
  ],
  difficulties: [
    {
      level: 1,
      name: "Highly supported",
      npcInitiative: "High",
      conversationTurns: 3,
      ambiguity: "None",
      openingSpeaker: "Mia",
      openingReply: "Hi! We’re building a castle. Want to help?",
      openingCoachNote: "Mia asked a clear question. You can answer in any way that feels right.",
    },
    {
      level: 2,
      name: "Guided initiation",
      npcInitiative: "Moderate",
      conversationTurns: 4,
      ambiguity: "Low",
      openingSpeaker: "Mia",
      openingReply: "Hey! We’re making a castle.",
      openingCoachNote: "Notice what Mia and Jordan are doing. Decide whether you want to talk to them.",
    },
    {
      level: 3,
      name: "Independent initiation",
      npcInitiative: "Low",
      conversationTurns: 6,
      ambiguity: "Mild",
      openingSpeaker: "Mia",
      openingReply: "Jordan, let’s make the gate taller.",
      openingCoachNote: "They are busy building. You can watch, approach, speak, or choose not to join.",
    },
    {
      level: 4,
      name: "Flexible social situation",
      npcInitiative: "Low",
      conversationTurns: 7,
      ambiguity: "Moderate, with one realistic unexpected event",
      openingSpeaker: "Jordan",
      openingReply: "We only have three blocks left for this part.",
      openingCoachNote: "The play is already underway. Choose how you want to enter—or whether to enter at all.",
    },
  ],
  opening: {
    coachNote: "Notice what they are doing. Decide whether you want to interact.",
    peerLabel: "Mia says",
    peerReply: "Hey! We’re making a castle.",
  },
  fallback: {
    coachNote: "Take your time. There is more than one clear way to communicate here.",
    peerReply: "Okay. What would you like to do?",
  },
  modelContext: {
    scene: "A child arrives at a playground. Mia and Jordan, two same-age peers, are building a castle with large blocks.",
    goal: "Move through observe, approach, initiate, respond, participate, handle one unexpected event, then continue, switch activities, or leave.",
    safety: "The child is practicing a peer interaction at a playground with a caregiver nearby. Report only clear, observable concerns.",
  },
};

const scenarios: Record<string, ScenarioDefinition> = { [playgroundScenario.id]: playgroundScenario };

export function getScenario(id: string) {
  return scenarios[id] ?? null;
}

export function listScenarios() {
  return Object.values(scenarios);
}

export function getDifficulty(scenario: ScenarioDefinition, level: number) {
  return scenario.difficulties.find((item) => item.level === level) ?? scenario.difficulties[1];
}
