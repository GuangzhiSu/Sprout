export const stageDefinitions = [
  { id: "observe", label: "Observe", objective: "Notice the activity and decide whether you want to interact." },
  { id: "approach", label: "Approach", objective: "Move closer in a way that feels comfortable." },
  { id: "initiate", label: "Initiate", objective: "Let the other children know what you want." },
  { id: "respond", label: "Respond", objective: "Respond to what one child says." },
  { id: "participate", label: "Play together", objective: "Take a few turns and keep the interaction going." },
  { id: "unexpected", label: "Something changes", objective: "Handle a small change, misunderstanding, or limit." },
  { id: "decide", label: "Choose next", objective: "Continue, switch activities, wait, or leave." },
  { id: "complete", label: "Finished", objective: "The interaction has reached a natural stopping point." },
] as const;

export type InteractionStage = (typeof stageDefinitions)[number]["id"];
export type DifficultyLevel = 1 | 2 | 3 | 4;
export type PromptLevel = 0 | 1 | 2 | 3 | 4;
export type ScenarioBranch = "none" | "accepted" | "maybe" | "rejected" | "unclear";

export const intentCategories = [
  "join_play",
  "greet",
  "respond_to_question",
  "ask_question",
  "ask_for_help",
  "clarify",
  "reject_offer",
  "accept_offer",
  "suggest_activity",
  "continue_play",
  "exit_interaction",
  "respond_to_rejection",
  "unclear",
] as const;

export type InteractionIntent = (typeof intentCategories)[number];

export type InteractionAnalysis = {
  intent: InteractionIntent;
  interactionStage: InteractionStage;
  socialGoalAchieved: boolean | "partial";
  needsPrompt: boolean;
  promptLevel: PromptLevel;
  responseLatencyMs: number;
  clarificationNeeded: boolean;
  possibleNextStage: InteractionStage;
};

export type SessionMetrics = {
  spontaneousInitiations: number;
  highestPromptLevel: PromptLevel;
  promptLevelTotal: number;
  responseLatencyTotalMs: number;
  conversationalTurns: number;
  successfulTurns: number;
  maintainedInteraction: boolean;
  clarificationAttempts: number;
  successfulClarifications: number;
  helpRequests: number;
  rejectionResponses: number;
  activityCompleted: boolean;
};

export type ScenarioRuntimeState = {
  stage: InteractionStage;
  difficulty: DifficultyLevel;
  promptLevel: PromptLevel;
  branch: ScenarioBranch;
  speaker: "Mia" | "Jordan";
  turnCount: number;
  turnsInStage: number;
  recentIndependentSuccesses: number;
  metrics: SessionMetrics;
};

export type PlayerProfile = {
  initiationSkill: number;
  responseSkill: number;
  turnTaking: number;
  conversationMaintenance: number;
  clarificationSkill: number;
  rejectionHandling: number;
  helpRequesting: number;
  promptDependency: "low" | "medium" | "high";
  averageResponseLatencyMs: number;
  preferredActivity: string;
  preferredTopics: string[];
  toleratedConversationLength: number;
  toleratedNumberOfNpcs: number;
  recommendedDifficulty: DifficultyLevel;
};

export const defaultPlayerProfile: PlayerProfile = {
  initiationSkill: 2,
  responseSkill: 2,
  turnTaking: 2,
  conversationMaintenance: 2,
  clarificationSkill: 2,
  rejectionHandling: 2,
  helpRequesting: 2,
  promptDependency: "medium",
  averageResponseLatencyMs: 0,
  preferredActivity: "building",
  preferredTopics: [],
  toleratedConversationLength: 5,
  toleratedNumberOfNpcs: 2,
  recommendedDifficulty: 2,
};

const initialPrompt: Record<DifficultyLevel, PromptLevel> = { 1: 2, 2: 1, 3: 0, 4: 0 };
const participationTurns: Record<DifficultyLevel, number> = { 1: 1, 2: 2, 3: 3, 4: 3 };

export function createInitialScenarioState(difficulty: DifficultyLevel = 2): ScenarioRuntimeState {
  return {
    stage: difficulty === 1 ? "respond" : "observe",
    difficulty,
    promptLevel: initialPrompt[difficulty],
    branch: "none",
    speaker: difficulty === 4 ? "Jordan" : "Mia",
    turnCount: 0,
    turnsInStage: 0,
    recentIndependentSuccesses: 0,
    metrics: {
      spontaneousInitiations: 0,
      highestPromptLevel: initialPrompt[difficulty],
      promptLevelTotal: 0,
      responseLatencyTotalMs: 0,
      conversationalTurns: 0,
      successfulTurns: 0,
      maintainedInteraction: false,
      clarificationAttempts: 0,
      successfulClarifications: 0,
      helpRequests: 0,
      rejectionResponses: 0,
      activityCompleted: false,
    },
  };
}

const promptCopy: Record<Exclude<InteractionStage, "complete">, {
  environmental: string;
  intent: string;
  starter: string;
  examples: Array<{ text: string; intent: string }>;
}> = {
  observe: {
    environmental: "Mia and Jordan are building a block castle together.",
    intent: "You can decide whether you want to join, watch, or leave.",
    starter: "You could start with: “I want…”",
    examples: [
      { text: "I want to say hello.", intent: "Approach" },
      { text: "I want to watch first.", intent: "Watch" },
      { text: "I don’t want to join.", intent: "Choose not to" },
    ],
  },
  approach: {
    environmental: "They are close enough to hear you now.",
    intent: "You can greet them or show interest in the castle.",
    starter: "You could start with: “Hi…”",
    examples: [
      { text: "Hi!", intent: "Greet" },
      { text: "That castle looks fun.", intent: "Show interest" },
      { text: "What are you building?", intent: "Ask" },
    ],
  },
  initiate: {
    environmental: "Mia looks up while Jordan keeps building.",
    intent: "If you want to play, you can let them know.",
    starter: "You could start with: “Can I…”",
    examples: [
      { text: "Can I play with you?", intent: "Join" },
      { text: "Can I help build?", intent: "Offer help" },
      { text: "What are you making?", intent: "Ask first" },
    ],
  },
  respond: {
    environmental: "One child has answered and is waiting.",
    intent: "You can answer, ask a question, or say no.",
    starter: "You could start with: “Yes…” or “No…”",
    examples: [
      { text: "Yes, I can build the gate.", intent: "Accept" },
      { text: "Which block should I use?", intent: "Clarify" },
      { text: "No thanks. I’ll watch.", intent: "Decline" },
    ],
  },
  participate: {
    environmental: "The children are taking turns adding blocks.",
    intent: "You can take a turn, ask for help, or add an idea.",
    starter: "You could start with: “Can you…” or “Let’s…”",
    examples: [
      { text: "Can you pass that block?", intent: "Ask" },
      { text: "Let’s make a bridge too.", intent: "Suggest" },
      { text: "Can you help me?", intent: "Ask for help" },
    ],
  },
  unexpected: {
    environmental: "Something in the play has changed.",
    intent: "You can ask what happened, suggest another plan, wait, or leave.",
    starter: "You could start with: “Do you mean…” or “Could we…”",
    examples: [
      { text: "Do you mean this part is full?", intent: "Clarify" },
      { text: "Could I build something else?", intent: "Adapt" },
      { text: "Okay. I’ll do something else.", intent: "Handle a no" },
    ],
  },
  decide: {
    environmental: "You can choose what happens next.",
    intent: "Continuing, switching, waiting, and leaving are all valid choices.",
    starter: "You could start with: “I’d like…”",
    examples: [
      { text: "I’d like to keep building.", intent: "Continue" },
      { text: "Can we draw with chalk?", intent: "Switch" },
      { text: "I’m done for now. Bye.", intent: "Leave" },
    ],
  },
};

export function getStageDefinition(stage: InteractionStage) {
  return stageDefinitions.find((item) => item.id === stage) ?? stageDefinitions[0];
}

export function getPromptSupport(stage: InteractionStage, level: PromptLevel) {
  if (stage === "complete" || level === 0) {
    return { level: 0 as PromptLevel, label: "Your turn", text: "", suggestions: [] as Array<{ text: string; intent: string }> };
  }
  const copy = promptCopy[stage];
  if (level === 1) return { level, label: "Notice", text: copy.environmental, suggestions: [] };
  if (level === 2) return { level, label: "Think about your goal", text: copy.intent, suggestions: [] };
  if (level === 3) return { level, label: "Sentence starter", text: copy.starter, suggestions: [] };
  return { level, label: "Example words", text: "Choose one, change it, or use your own words.", suggestions: copy.examples };
}

export function clampPromptLevel(value: number): PromptLevel {
  return Math.max(0, Math.min(4, Math.round(value))) as PromptLevel;
}

export function isIntent(value: unknown): value is InteractionIntent {
  return typeof value === "string" && (intentCategories as readonly string[]).includes(value);
}

export function fallbackAnalyze(transcript: string, state: ScenarioRuntimeState, responseLatencyMs: number): InteractionAnalysis {
  const text = transcript.toLowerCase().trim();
  let intent: InteractionIntent = "continue_play";

  if (!text) intent = "unclear";
  else if (/\b(bye|leave|go away|stop|done|finished|need a break)\b/.test(text)) intent = "exit_interaction";
  else if (state.branch === "rejected" && /\b(ok|okay|later|next|something else|another|watch|wait)\b/.test(text)) intent = "respond_to_rejection";
  else if (/\b(can i|may i|could i).*(play|join|help|come)\b|\bjoin you\b/.test(text)) intent = "join_play";
  else if (/\b(hi|hello|hey)\b/.test(text)) intent = "greet";
  else if (/\b(can you help|help me|show me|i need help)\b/.test(text)) intent = "ask_for_help";
  else if (/\b(what do you mean|say that again|did you mean|which one|which part)\b/.test(text)) intent = "clarify";
  else if (/\b(no|nope|not now|don\'?t want|no thanks)\b/.test(text)) intent = "reject_offer";
  else if (/\b(yes|yeah|sure|okay|ok|i can)\b/.test(text)) intent = state.branch === "rejected" ? "respond_to_rejection" : "accept_offer";
  else if (/\?|\b(what|where|when|why|how|which|who)\b/.test(text)) intent = "ask_question";
  else if (/\b(let'?s|we could|how about|maybe we)\b/.test(text)) intent = "suggest_activity";
  else if (text.length < 2) intent = "unclear";
  else if (state.stage === "respond") intent = "respond_to_question";

  const socialGoalAchieved = evaluateGoal(state.stage, intent);
  const clarificationNeeded = intent === "unclear";
  const nextPromptLevel = socialGoalAchieved === true
    ? clampPromptLevel(state.promptLevel - 1)
    : clarificationNeeded
      ? clampPromptLevel(state.promptLevel + 1)
      : state.promptLevel;

  return {
    intent,
    interactionStage: state.stage,
    socialGoalAchieved,
    needsPrompt: socialGoalAchieved !== true,
    promptLevel: nextPromptLevel,
    responseLatencyMs: Math.max(0, Math.min(responseLatencyMs, 300_000)),
    clarificationNeeded,
    possibleNextStage: predictNextStage(state, socialGoalAchieved, intent),
  };
}

export function evaluateGoal(stage: InteractionStage, intent: InteractionIntent): boolean | "partial" {
  if (intent === "exit_interaction") return true;
  if (intent === "unclear") return false;
  const valid: Record<InteractionStage, InteractionIntent[]> = {
    observe: ["join_play", "greet", "ask_question", "suggest_activity", "reject_offer", "accept_offer", "respond_to_question", "continue_play"],
    approach: ["join_play", "greet", "ask_question", "suggest_activity", "continue_play"],
    initiate: ["join_play", "greet", "ask_question", "suggest_activity", "ask_for_help"],
    respond: ["respond_to_question", "accept_offer", "reject_offer", "ask_question", "clarify", "continue_play"],
    participate: ["continue_play", "ask_question", "ask_for_help", "clarify", "suggest_activity", "respond_to_question"],
    unexpected: ["respond_to_rejection", "clarify", "suggest_activity", "continue_play", "accept_offer", "reject_offer", "ask_question"],
    decide: ["respond_to_rejection", "suggest_activity", "continue_play", "accept_offer", "reject_offer", "ask_question"],
    complete: [],
  };
  if (valid[stage].includes(intent)) return true;
  return "partial";
}

function predictNextStage(state: ScenarioRuntimeState, progress: boolean | "partial", intent: InteractionIntent): InteractionStage {
  if (intent === "exit_interaction") return "complete";
  if (progress !== true) return state.stage;
  if (state.stage === "observe") {
    if (intent === "reject_offer") return "complete";
    if (["join_play", "greet", "ask_question", "suggest_activity"].includes(intent)) return "respond";
    return "approach";
  }
  if (state.stage === "approach") {
    if (["join_play", "greet", "ask_question", "suggest_activity"].includes(intent)) return "respond";
    return "initiate";
  }
  if (state.stage === "initiate") return "respond";
  if (state.stage === "respond") return intent === "reject_offer" ? "decide" : "participate";
  if (state.stage === "participate") {
    return state.turnsInStage + 1 >= participationTurns[state.difficulty] ? "unexpected" : "participate";
  }
  if (state.stage === "unexpected") return "decide";
  if (state.stage === "decide") return "complete";
  return "complete";
}

export function advanceScenario(state: ScenarioRuntimeState, analysis: InteractionAnalysis): ScenarioRuntimeState {
  const success = analysis.socialGoalAchieved === true;
  const nextStage = analysis.intent === "exit_interaction"
    ? "complete"
    : predictNextStage(state, analysis.socialGoalAchieved, analysis.intent);
  const advanced = nextStage !== state.stage;
  let branch: ScenarioBranch = analysis.clarificationNeeded ? "unclear" : success ? "none" : state.branch;

  if (nextStage === "respond" && success) branch = state.difficulty >= 3 ? "maybe" : "accepted";
  if (nextStage === "unexpected") {
    branch = state.difficulty === 4 ? "rejected" : state.difficulty === 3 ? "unclear" : "accepted";
  }

  const promptLevel = success
    ? clampPromptLevel(state.promptLevel - 1)
    : analysis.socialGoalAchieved === false
      ? clampPromptLevel(state.promptLevel + 1)
      : state.promptLevel;
  const metrics = { ...state.metrics };
  metrics.conversationalTurns += 1;
  metrics.promptLevelTotal += state.promptLevel;
  metrics.highestPromptLevel = Math.max(metrics.highestPromptLevel, state.promptLevel) as PromptLevel;
  metrics.responseLatencyTotalMs += analysis.responseLatencyMs;
  if (success) metrics.successfulTurns += 1;
  if (
    ["observe", "approach", "initiate"].includes(state.stage) &&
    ["join_play", "greet", "ask_question", "suggest_activity"].includes(analysis.intent) &&
    success && state.promptLevel <= 1
  ) metrics.spontaneousInitiations += 1;
  if (analysis.clarificationNeeded) metrics.clarificationAttempts += 1;
  if (state.branch === "unclear" && success) metrics.successfulClarifications += 1;
  if (analysis.intent === "ask_for_help") metrics.helpRequests += 1;
  if (state.branch === "rejected" && success) metrics.rejectionResponses += 1;
  if (state.stage === "participate" && success) metrics.maintainedInteraction = true;
  if (nextStage === "complete") metrics.activityCompleted = true;

  return {
    ...state,
    stage: nextStage,
    branch,
    promptLevel,
    speaker: state.difficulty === 1 ? "Mia" : state.speaker === "Mia" ? "Jordan" : "Mia",
    turnCount: state.turnCount + 1,
    turnsInStage: advanced ? 0 : state.turnsInStage + 1,
    recentIndependentSuccesses: success && state.promptLevel <= 1 ? state.recentIndependentSuccesses + 1 : 0,
    metrics,
  };
}

export function requiredNpcMove(state: ScenarioRuntimeState) {
  if (state.branch === "unclear") return "Use a natural repair: say you did not hear or understand, then ask one concrete clarification question.";
  if (state.stage === "approach") return "Acknowledge the child briefly without completing the task for them.";
  if (state.stage === "initiate") return "Leave a clear opening for the child to greet, comment, ask, or request to join.";
  if (state.stage === "respond") {
    return state.branch === "maybe"
      ? "Respond with mild hesitation and one short, answerable question."
      : "Accept or acknowledge the child's meaning and ask one short follow-up question.";
  }
  if (state.stage === "participate") return "Continue the block-building play with one age-appropriate turn or question.";
  if (state.stage === "unexpected") {
    if (state.branch === "rejected") return "Say that this part is full right now, without blame, and leave room for another option.";
    return "Introduce a small concrete change, such as a block falling or the plan changing.";
  }
  if (state.stage === "decide") return "Respond to the child's adaptation and make continuing, switching, waiting, or leaving possible.";
  if (state.stage === "complete") return "End naturally and briefly without evaluating the child.";
  return "Keep playing naturally while leaving the child free to choose whether to interact.";
}

export function fallbackLanguage(state: ScenarioRuntimeState, analysis: InteractionAnalysis) {
  const support = getPromptSupport(state.stage, state.promptLevel);
  const replies: Record<InteractionStage, string> = {
    observe: "Jordan, let’s put the blue block here.",
    approach: state.difficulty === 1 ? "Hi! Want to come closer and see?" : "Hey.",
    initiate: "We’re making a castle with a tall gate.",
    respond: state.branch === "maybe" ? "Maybe. What part did you want to build?" : "Sure. Do you want to help with the gate?",
    participate: state.speaker === "Mia" ? "Can you pass me the long blue block?" : "I’m making the tower. What are you making?",
    unexpected: state.branch === "rejected"
      ? "This part is full right now. Maybe you could build beside us."
      : state.branch === "unclear"
        ? "Sorry, I didn’t hear you. Did you ask about the tower?"
        : "Oh! The gate fell down. What should we do?",
    decide: "Okay. We can keep building, use the chalk, or stop for now.",
    complete: analysis.intent === "exit_interaction" ? "Okay. Bye!" : "Thanks for building with us. See you later!",
  };
  return {
    npcReply: state.branch === "unclear" && state.stage !== "unexpected"
      ? "Sorry, I didn’t understand. Do you mean you want to help build?"
      : replies[state.stage],
    coachNote: support.text || "Try it in your own words. There is more than one good way to respond.",
    suggestions: support.suggestions,
  };
}

export type SessionSummary = {
  difficulty: DifficultyLevel;
  spontaneousInitiation: boolean;
  highestPromptLevel: PromptLevel;
  averagePromptLevel: number;
  averageResponseLatencyMs: number;
  conversationTurns: number;
  maintainedInteraction: boolean;
  clarificationAttempts: number;
  successfulClarifications: number;
  helpRequests: number;
  rejectionResponses: number;
  activityCompleted: boolean;
  exitStage: InteractionStage;
  suggestedNextDifficulty: DifficultyLevel;
};

export function buildSessionSummary(state: ScenarioRuntimeState): SessionSummary {
  const turns = Math.max(1, state.metrics.conversationalTurns);
  const averagePromptLevel = Math.round((state.metrics.promptLevelTotal / turns) * 10) / 10;
  const averageResponseLatencyMs = Math.round(state.metrics.responseLatencyTotalMs / turns);
  let suggestedNextDifficulty: DifficultyLevel = state.difficulty;
  if (
    state.metrics.activityCompleted &&
    state.metrics.successfulTurns >= 4 &&
    averagePromptLevel <= 1 &&
    averageResponseLatencyMs <= 45_000
  ) {
    suggestedNextDifficulty = Math.min(4, state.difficulty + 1) as DifficultyLevel;
  } else if (
    state.metrics.highestPromptLevel >= 3 ||
    (!state.metrics.maintainedInteraction && state.metrics.conversationalTurns <= 3)
  ) {
    suggestedNextDifficulty = Math.max(1, state.difficulty - 1) as DifficultyLevel;
  }
  return {
    difficulty: state.difficulty,
    spontaneousInitiation: state.metrics.spontaneousInitiations > 0,
    highestPromptLevel: state.metrics.highestPromptLevel,
    averagePromptLevel,
    averageResponseLatencyMs,
    conversationTurns: state.metrics.conversationalTurns,
    maintainedInteraction: state.metrics.maintainedInteraction,
    clarificationAttempts: state.metrics.clarificationAttempts,
    successfulClarifications: state.metrics.successfulClarifications,
    helpRequests: state.metrics.helpRequests,
    rejectionResponses: state.metrics.rejectionResponses,
    activityCompleted: state.metrics.activityCompleted,
    exitStage: state.stage,
    suggestedNextDifficulty,
  };
}
