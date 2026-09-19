export type ScenarioSuggestion = {
  text: string;
  intent: string;
};

export type ScenarioDefinition = {
  id: string;
  sequenceLabel: string;
  title: string;
  sceneAriaLabel: string;
  image: {
    src: string;
    alt: string;
  };
  mission: {
    step: number;
    label: string;
    title: string;
    items: string[];
    note: string;
  };
  opening: {
    coachNote: string;
    peerLabel: string;
    peerReply: string;
    suggestions: ScenarioSuggestion[];
  };
  fallback: {
    coachNote: string;
    peerReply: string;
  };
  peerReplies: {
    joined: string;
    continued: string;
  };
  modelContext: {
    scene: string;
    goal: string;
    safety: string;
  };
};

export const playgroundScenario: ScenarioDefinition = {
  id: "playground",
  sequenceLabel: "Scenario 01",
  title: "Meet new friends at the playground",
  sceneAriaLabel: "Playground practice scene",
  image: {
    src: "/playground-scene.png",
    alt: "A sunny playground where two children build with blocks as another child walks toward them",
  },
  mission: {
    step: 1,
    label: "Your mission",
    title: "Walk over and say hello",
    items: [
      "Notice what they are playing",
      "Choose one thing to say",
      "Wait for their answer",
    ],
    note: "Take your time. You can pause whenever you need.",
  },
  opening: {
    coachNote: "First, notice what they are doing. Then choose one thing you would like to say.",
    peerLabel: "Your new friend says",
    peerReply: "We’re building a castle!",
    suggestions: [
      { text: "Can I play with you?", intent: "Join in" },
      { text: "What are you building?", intent: "Ask first" },
      { text: "I like blocks too.", intent: "Share interest" },
    ],
  },
  fallback: {
    coachNote: "You spoke up. Try a short sentence, then give the other person time to answer.",
    peerReply: "Sure! Which part would you like to build?",
  },
  peerReplies: {
    joined: "Sure! You can help us build the gate.",
    continued: "We’re building a castle. Want to see?",
  },
  modelContext: {
    scene: "A child arrives at a playground and sees two same-age peers building a castle with large blocks.",
    goal: "Notice the shared activity, approach, initiate, wait for a response, continue the exchange, and ask for a break when needed.",
    safety: "The child is practicing a peer interaction in a playground setting with a caregiver nearby.",
  },
};

const scenarios: Record<string, ScenarioDefinition> = {
  [playgroundScenario.id]: playgroundScenario,
};

export function getScenario(id: string) {
  return scenarios[id] ?? null;
}

export function listScenarios() {
  return Object.values(scenarios);
}
