import { getD1 } from "@/db";
import {
  buildSessionSummary,
  defaultPlayerProfile,
  type InteractionAnalysis,
  type PlayerProfile,
  type ScenarioRuntimeState,
} from "@/lib/playground-engine";

type ProfileRow = {
  initiation_skill: number;
  response_skill: number;
  turn_taking: number;
  conversation_maintenance: number;
  clarification_skill: number;
  rejection_handling: number;
  help_requesting: number;
  prompt_dependency: string;
  average_response_latency_ms: number;
  preferred_activity: string;
  preferred_topics_json: string;
  tolerated_conversation_length: number;
  tolerated_number_of_npcs: number;
  recommended_difficulty: number;
};

function score(value: number) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function difficulty(value: number) {
  return Math.max(1, Math.min(4, Math.round(value))) as 1 | 2 | 3 | 4;
}

function profileFromRow(row: ProfileRow | null): PlayerProfile {
  if (!row) return defaultPlayerProfile;
  let topics: string[] = [];
  try {
    const parsed = JSON.parse(row.preferred_topics_json);
    if (Array.isArray(parsed)) topics = parsed.map(String).slice(0, 12);
  } catch {
    topics = [];
  }
  const promptDependency = ["low", "medium", "high"].includes(row.prompt_dependency)
    ? row.prompt_dependency as PlayerProfile["promptDependency"]
    : "medium";
  return {
    initiationSkill: score(row.initiation_skill),
    responseSkill: score(row.response_skill),
    turnTaking: score(row.turn_taking),
    conversationMaintenance: score(row.conversation_maintenance),
    clarificationSkill: score(row.clarification_skill),
    rejectionHandling: score(row.rejection_handling),
    helpRequesting: score(row.help_requesting),
    promptDependency,
    averageResponseLatencyMs: Math.max(0, row.average_response_latency_ms),
    preferredActivity: row.preferred_activity || "building",
    preferredTopics: topics,
    toleratedConversationLength: Math.max(2, Math.min(12, row.tolerated_conversation_length)),
    toleratedNumberOfNpcs: Math.max(1, Math.min(2, row.tolerated_number_of_npcs)),
    recommendedDifficulty: difficulty(row.recommended_difficulty),
  };
}

export function authenticatedUserId(request: Request) {
  return request.headers.get("oai-authenticated-user-id") || "local-preview";
}

export async function loadPlayerProgress(userId: string) {
  const db = getD1();
  const row = await db.prepare(`
    SELECT initiation_skill, response_skill, turn_taking, conversation_maintenance,
      clarification_skill, rejection_handling, help_requesting, prompt_dependency,
      average_response_latency_ms, preferred_activity, preferred_topics_json,
      tolerated_conversation_length, tolerated_number_of_npcs, recommended_difficulty
    FROM player_profiles WHERE user_id = ?
  `).bind(userId).first<ProfileRow>();
  const sessions = await db.prepare(`
    SELECT id, scenario_id, ended_at, difficulty, suggested_next_difficulty,
      spontaneous_initiations, highest_prompt_level, average_prompt_level_tenths,
      average_response_latency_ms, conversational_turns, maintained_interaction,
      clarification_attempts, successful_clarifications, help_requests,
      rejection_responses, activity_completed, exit_stage
    FROM practice_sessions WHERE user_id = ? ORDER BY ended_at DESC LIMIT 6
  `).bind(userId).all();
  return { profile: profileFromRow(row), recentSessions: sessions.results ?? [] };
}

export async function recordInteractionTurn(args: {
  request: Request;
  sessionId: string;
  scenarioId: string;
  stateBefore: ScenarioRuntimeState;
  analysis: InteractionAnalysis;
}) {
  const db = getD1();
  const goal = args.analysis.socialGoalAchieved === "partial"
    ? "partial"
    : args.analysis.socialGoalAchieved ? "true" : "false";
  await db.prepare(`
    INSERT INTO interaction_turns (
      session_id, user_id, scenario_id, stage, intent, social_goal_achieved,
      prompt_level, response_latency_ms, clarification_needed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    args.sessionId,
    authenticatedUserId(args.request),
    args.scenarioId,
    args.stateBefore.stage,
    args.analysis.intent,
    goal,
    args.stateBefore.promptLevel,
    args.analysis.responseLatencyMs,
    args.analysis.clarificationNeeded ? 1 : 0,
    new Date().toISOString(),
  ).run();
}

export async function saveCompletedSession(args: {
  request: Request;
  sessionId: string;
  scenarioId: string;
  startedAt: string;
  state: ScenarioRuntimeState;
}) {
  const db = getD1();
  const userId = authenticatedUserId(args.request);
  const summary = buildSessionSummary(args.state);
  const now = new Date().toISOString();
  const existing = await db.prepare(`
    SELECT id FROM practice_sessions WHERE id = ? AND user_id = ?
  `).bind(args.sessionId, userId).first<{ id: string }>();
  if (existing) return summary;
  const current = await db.prepare(`
    SELECT initiation_skill, response_skill, turn_taking, conversation_maintenance,
      clarification_skill, rejection_handling, help_requesting, prompt_dependency,
      average_response_latency_ms, preferred_activity, preferred_topics_json,
      tolerated_conversation_length, tolerated_number_of_npcs, recommended_difficulty
    FROM player_profiles WHERE user_id = ?
  `).bind(userId).first<ProfileRow>();
  const profile = profileFromRow(current);
  const up = summary.activityCompleted && summary.averagePromptLevel <= 1 ? 1 : 0;
  const down = summary.highestPromptLevel >= 3 ? 1 : 0;
  const initiationSkill = score(profile.initiationSkill + (summary.spontaneousInitiation ? 1 : 0) - down);
  const responseSkill = score(profile.responseSkill + up - down);
  const turnTaking = score(profile.turnTaking + (summary.conversationTurns >= 4 ? 1 : 0) - down);
  const maintenance = score(profile.conversationMaintenance + (summary.maintainedInteraction ? 1 : 0) - down);
  const clarification = score(profile.clarificationSkill + (summary.successfulClarifications > 0 ? 1 : 0));
  const rejection = score(profile.rejectionHandling + (summary.rejectionResponses > 0 ? 1 : 0));
  const help = score(profile.helpRequesting + (summary.helpRequests > 0 ? 1 : 0));
  const promptDependency = summary.averagePromptLevel <= 1 ? "low" : summary.averagePromptLevel >= 2.5 ? "high" : "medium";

  const sessionStatement = db.prepare(`
    INSERT INTO practice_sessions (
      id, user_id, scenario_id, started_at, ended_at, difficulty,
      suggested_next_difficulty, spontaneous_initiations, highest_prompt_level,
      average_prompt_level_tenths, average_response_latency_ms, conversational_turns,
      maintained_interaction, clarification_attempts, successful_clarifications,
      help_requests, rejection_responses, activity_completed, exit_stage
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET ended_at = excluded.ended_at,
      suggested_next_difficulty = excluded.suggested_next_difficulty,
      spontaneous_initiations = excluded.spontaneous_initiations,
      highest_prompt_level = excluded.highest_prompt_level,
      average_prompt_level_tenths = excluded.average_prompt_level_tenths,
      average_response_latency_ms = excluded.average_response_latency_ms,
      conversational_turns = excluded.conversational_turns,
      maintained_interaction = excluded.maintained_interaction,
      clarification_attempts = excluded.clarification_attempts,
      successful_clarifications = excluded.successful_clarifications,
      help_requests = excluded.help_requests,
      rejection_responses = excluded.rejection_responses,
      activity_completed = excluded.activity_completed,
      exit_stage = excluded.exit_stage
  `).bind(
    args.sessionId, userId, args.scenarioId, args.startedAt, now, summary.difficulty,
    summary.suggestedNextDifficulty, summary.spontaneousInitiation ? 1 : 0,
    summary.highestPromptLevel, Math.round(summary.averagePromptLevel * 10),
    summary.averageResponseLatencyMs, summary.conversationTurns,
    summary.maintainedInteraction ? 1 : 0, summary.clarificationAttempts,
    summary.successfulClarifications, summary.helpRequests, summary.rejectionResponses,
    summary.activityCompleted ? 1 : 0, summary.exitStage,
  );

  const profileStatement = db.prepare(`
    INSERT INTO player_profiles (
      user_id, initiation_skill, response_skill, turn_taking, conversation_maintenance,
      clarification_skill, rejection_handling, help_requesting, prompt_dependency,
      average_response_latency_ms, preferred_activity, preferred_topics_json,
      tolerated_conversation_length, tolerated_number_of_npcs, recommended_difficulty,
      sessions_completed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      initiation_skill = excluded.initiation_skill,
      response_skill = excluded.response_skill,
      turn_taking = excluded.turn_taking,
      conversation_maintenance = excluded.conversation_maintenance,
      clarification_skill = excluded.clarification_skill,
      rejection_handling = excluded.rejection_handling,
      help_requesting = excluded.help_requesting,
      prompt_dependency = excluded.prompt_dependency,
      average_response_latency_ms = excluded.average_response_latency_ms,
      recommended_difficulty = excluded.recommended_difficulty,
      sessions_completed = player_profiles.sessions_completed + 1,
      updated_at = excluded.updated_at
  `).bind(
    userId, initiationSkill, responseSkill, turnTaking, maintenance, clarification,
    rejection, help, promptDependency, summary.averageResponseLatencyMs,
    profile.preferredActivity, JSON.stringify(profile.preferredTopics),
    profile.toleratedConversationLength, profile.toleratedNumberOfNpcs,
    summary.suggestedNextDifficulty, now, now,
  );

  await db.batch([sessionStatement, profileStatement]);
  return summary;
}
