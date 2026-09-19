export type ScenarioDefinition = {
  id: string;
  sequenceLabel: string;
  title: string;
  sceneAriaLabel: string;
  image: {
    src: string;
    alt: string;
  };
  backgroundAudio?: { src: string; volume: number };
  opening: {
    coachNote: string;
    peerLabel: string;
    peerReply: string;
  };
  fallback: {
    coachNote: string;
    peerReply: string;
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
  backgroundAudio: { src: "/audio/freesound_community-playground-7156.mp3", volume: 0.8 },
  opening: {
    coachNote: "First, notice what they are doing. Then choose one thing you would like to say.",
    peerLabel: "Your new friend says",
    peerReply: "We’re building a castle!",
  },
  fallback: {
    coachNote: "You spoke up. Try a short sentence, then give the other person time to answer.",
    peerReply: "Sure! Which part would you like to build?",
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
