import {
  advanceScenario,
  clampPromptLevel,
  createInitialScenarioState,
  evaluateGoal,
  fallbackAnalyze,
  fallbackLanguage,
  getPromptSupport,
  isIntent,
  requiredNpcMove,
  stageDefinitions,
  type DifficultyLevel,
  type InteractionAnalysis,
  type InteractionStage,
  type ScenarioRuntimeState,
} from "@/lib/playground-engine";
import { recordInteractionTurn } from "@/lib/progress-store";
import { getDifficulty, getScenario, type ScenarioDefinition } from "@/lib/scenarios";

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid model response");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

async function askArk(system: string, user: string, temperature: number, maxTokens: number) {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("ARK_API_KEY is unavailable");
  const model = process.env.ARK_MODEL || "doubao-seed-2-0-lite-260215";
  const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const result = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(result.error?.message || "Doubao request failed");
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("Doubao returned no content");
  return extractJson(content);
}

function normalizeState(value: unknown): ScenarioRuntimeState {
  if (!value || typeof value !== "object") return createInitialScenarioState();
  const candidate = value as Partial<ScenarioRuntimeState>;
  const validStages = stageDefinitions.map((item) => item.id) as readonly string[];
  const difficulty = Math.max(1, Math.min(4, Number(candidate.difficulty) || 2)) as DifficultyLevel;
  const base = createInitialScenarioState(difficulty);
  const metrics = candidate.metrics && typeof candidate.metrics === "object" ? candidate.metrics : base.metrics;
  const nonNegative = (input: unknown, maximum = 10_000) => Math.max(0, Math.min(maximum, Number(input) || 0));
  return {
    ...base,
    stage: validStages.includes(String(candidate.stage)) ? candidate.stage as InteractionStage : base.stage,
    promptLevel: clampPromptLevel(Number(candidate.promptLevel) || 0),
    branch: ["none", "accepted", "maybe", "rejected", "unclear"].includes(String(candidate.branch))
      ? candidate.branch as ScenarioRuntimeState["branch"]
      : "none",
    speaker: candidate.speaker === "Jordan" ? "Jordan" : "Mia",
    turnCount: nonNegative(candidate.turnCount, 30),
    turnsInStage: nonNegative(candidate.turnsInStage, 10),
    recentIndependentSuccesses: nonNegative(candidate.recentIndependentSuccesses, 20),
    metrics: {
      spontaneousInitiations: nonNegative(metrics.spontaneousInitiations, 20),
      highestPromptLevel: clampPromptLevel(Number(metrics.highestPromptLevel) || 0),
      promptLevelTotal: nonNegative(metrics.promptLevelTotal, 200),
      responseLatencyTotalMs: nonNegative(metrics.responseLatencyTotalMs, 3_600_000),
      conversationalTurns: nonNegative(metrics.conversationalTurns, 30),
      successfulTurns: nonNegative(metrics.successfulTurns, 30),
      maintainedInteraction: metrics.maintainedInteraction === true,
      clarificationAttempts: nonNegative(metrics.clarificationAttempts, 30),
      successfulClarifications: nonNegative(metrics.successfulClarifications, 30),
      helpRequests: nonNegative(metrics.helpRequests, 30),
      rejectionResponses: nonNegative(metrics.rejectionResponses, 30),
      activityCompleted: metrics.activityCompleted === true,
    },
  };
}

function analyzerPrompt() {
  return `You are the Interaction Analyzer inside a structured playground practice game. You do not speak to the child and you do not control the scenario.

Classify the child's communicative meaning, not exact wording or grammar. Unusual phrasing, AAC-style language, short answers, and imperfect grammar are valid when intent is understandable. Never infer a diagnosis, emotion, defiance, or eye contact.

Allowed intents:
join_play, greet, respond_to_question, ask_question, ask_for_help, clarify, reject_offer, accept_offer, suggest_activity, continue_play, exit_interaction, respond_to_rejection, unclear

Return strict JSON only:
{"intent":"one allowed intent","clarification_needed":false}`;
}

async function analyzeInteraction(
  transcript: string,
  state: ScenarioRuntimeState,
  responseLatencyMs: number,
) {
  const fallback = fallbackAnalyze(transcript, state, responseLatencyMs);
  if (!process.env.ARK_API_KEY) return { analysis: fallback, live: false };
  try {
    const payload = await askArk(
      analyzerPrompt(),
      `Current stage: ${state.stage}\nCurrent branch: ${state.branch}\nChild said: ${transcript}`,
      0.05,
      160,
    );
    const intent = isIntent(payload.intent) ? payload.intent : fallback.intent;
    const socialGoalAchieved = evaluateGoal(state.stage, intent);
    const analysis: InteractionAnalysis = {
      ...fallback,
      intent,
      socialGoalAchieved,
      needsPrompt: socialGoalAchieved !== true,
      promptLevel: socialGoalAchieved === true
        ? clampPromptLevel(state.promptLevel - 1)
        : socialGoalAchieved === false
          ? clampPromptLevel(state.promptLevel + 1)
          : state.promptLevel,
      clarificationNeeded: intent === "unclear" || payload.clarification_needed === true,
    };
    analysis.possibleNextStage = advanceScenario(state, analysis).stage;
    return { analysis, live: true };
  } catch (error) {
    console.error("interaction analyzer fallback", error instanceof Error ? error.message : error);
    return { analysis: fallback, live: false };
  }
}

type ChildProfile = { name?: string; age?: number | null; likes?: string[] };

/** One line about the child, or nothing when they told us nothing. */
function describeChild(profile?: ChildProfile) {
  if (!profile) return "";
  const parts: string[] = [];
  if (profile.name) parts.push(`is called ${profile.name}`);
  if (typeof profile.age === "number") parts.push(`is ${profile.age} years old`);
  if (profile.likes?.length) parts.push(`likes ${profile.likes.slice(0, 6).join(", ")}`);
  if (parts.length === 0) return "";
  return `\nThe child ${parts.join(", ")}. Use their name now and then, pitch the wording for their age, and mention what they like only when it fits the scene.`;
}

function npcPrompt(scenario: ScenarioDefinition, state: ScenarioRuntimeState, profile?: ChildProfile) {
  const difficulty = getDifficulty(scenario, state.difficulty);
  const speaker = scenario.npcs.find((npc) => npc.name === state.speaker) ?? scenario.npcs[0];
  return `You are the NPC Language Model in a structured child-centered practice game. The Scenario Manager has already chosen the stage, branch, difficulty, speaker, and required move. You may choose natural wording only; do not change those controls.

Scene: ${scenario.modelContext.scene}
Speaker: ${speaker.name}, age ${speaker.ageRange}
Personality: ${speaker.personality}
Current goal: ${speaker.currentGoal}
Difficulty: Level ${difficulty.level} — ${difficulty.name}
NPC initiative at this level: ${speaker.proactiveByDifficulty[state.difficulty]}
Required NPC move: ${requiredNpcMove(state)}${describeChild(profile)}

Rules:
- Sound like a child, not a therapist or teacher.
- Use one or two short, age-appropriate sentences.
- Respond to the child's meaning. Allow imperfect grammar.
- Never praise or grade a “social skill,” lecture, require eye contact, or ask the child to act normal.
- Make acceptance, hesitation, rejection, clarification, switching, waiting, and leaving all possible outcomes.
- Suggestions are first-person examples of at most 8 simple words and must express different valid strategies.
- Return strict JSON only:
{"npcReply":"short in-character response","coachNote":"brief neutral support","suggestions":[{"text":"short example","intent":"short label"},{"text":"short example","intent":"short label"},{"text":"short example","intent":"short label"}]}`;
}

function normalizeLanguage(payload: Record<string, unknown>, fallback: ReturnType<typeof fallbackLanguage>, state: ScenarioRuntimeState) {
  const rawSuggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  const suggestions = rawSuggestions.slice(0, 3).map((item) => {
    const value = item as Record<string, unknown>;
    return {
      text: String(value.text ?? "").trim().split(/\s+/).slice(0, 8).join(" ").slice(0, 64),
      intent: String(value.intent ?? "Try this").trim().slice(0, 24),
    };
  }).filter((item) => item.text);
  const support = getPromptSupport(state.stage, state.promptLevel);
  return {
    npcReply: String(payload.npcReply ?? fallback.npcReply).trim().slice(0, 180),
    coachNote: String(payload.coachNote ?? fallback.coachNote).trim().slice(0, 180),
    suggestions: state.promptLevel === 4 && suggestions.length === 3 ? suggestions : support.suggestions,
  };
}

async function generateNpcLanguage(args: {
  scenario: ScenarioDefinition;
  transcript: string;
  state: ScenarioRuntimeState;
  analysis: InteractionAnalysis;
  recentTurns: string[];
  /** Name, age and interests, collected in the tutorial and kept on the device. */
  profile?: ChildProfile;
}) {
  const fallback = fallbackLanguage(args.state, args.analysis);
  if (!process.env.ARK_API_KEY) return { language: fallback, live: false };
  try {
    const payload = await askArk(
      npcPrompt(args.scenario, args.state, args.profile),
      `State: ${JSON.stringify({
        stage: args.state.stage,
        branch: args.state.branch,
        promptLevel: args.state.promptLevel,
        speaker: args.state.speaker,
      })}\nAnalyzer result: ${JSON.stringify(args.analysis)}\nRecent conversation: ${args.recentTurns.join(" | ") || "none"}\nChild said: ${args.transcript}`,
      0.35,
      360,
    );
    return { language: normalizeLanguage(payload, fallback, args.state), live: true };
  } catch (error) {
    console.error("npc language fallback", error instanceof Error ? error.message : error);
    return { language: fallback, live: false };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scenarioId?: string;
      sessionId?: string;
      transcript?: string;
      responseLatencyMs?: number;
      state?: unknown;
      context?: { recentTurns?: string[] };
      profile?: ChildProfile;
    };
    const scenario = getScenario(body.scenarioId ?? "");
    if (!scenario) return Response.json({ error: "This scenario is not available." }, { status: 400 });
    const transcript = body.transcript?.trim().slice(0, 280) ?? "";
    const profile: ChildProfile | undefined = body.profile
      ? {
          name: typeof body.profile.name === "string" ? body.profile.name.trim().slice(0, 24) : undefined,
          age: typeof body.profile.age === "number" && Number.isFinite(body.profile.age) ? body.profile.age : null,
          likes: Array.isArray(body.profile.likes)
            ? body.profile.likes.filter((like) => typeof like === "string").slice(0, 6)
            : undefined,
        }
      : undefined;
    if (!transcript) return Response.json({ error: "Say or type something first." }, { status: 400 });
    const stateBefore = normalizeState(body.state);
    if (stateBefore.stage === "complete") {
      return Response.json({ error: "This practice session is already complete." }, { status: 409 });
    }
    const responseLatencyMs = Math.max(0, Math.min(Number(body.responseLatencyMs) || 0, 300_000));
    const analyzed = await analyzeInteraction(transcript, stateBefore, responseLatencyMs);
    const nextState = advanceScenario(stateBefore, analyzed.analysis);
    const generated = await generateNpcLanguage({
      scenario,
      transcript,
      state: nextState,
      analysis: analyzed.analysis,
      recentTurns: Array.isArray(body.context?.recentTurns)
        ? body.context.recentTurns.map(String).slice(-6).map((turn) => turn.slice(0, 220))
        : [],
      profile,
    });

    if (body.sessionId && /^[a-zA-Z0-9-]{8,80}$/.test(body.sessionId)) {
      try {
        await recordInteractionTurn({
          request,
          sessionId: body.sessionId,
          scenarioId: scenario.id,
          stateBefore,
          analysis: analyzed.analysis,
        });
      } catch (error) {
        console.error("turn tracking unavailable", error instanceof Error ? error.message : error);
      }
    }

    return Response.json({
      heard: transcript,
      npcName: nextState.speaker,
      peerReply: generated.language.npcReply,
      coachNote: generated.language.coachNote,
      suggestions: generated.language.suggestions,
      prompt: getPromptSupport(nextState.stage, nextState.promptLevel),
      analysis: analyzed.analysis,
      state: nextState,
      complete: nextState.stage === "complete",
      mode: analyzed.live && generated.live ? "live" : "guided-fallback",
    });
  } catch (error) {
    console.error("coach route failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Communication practice is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
