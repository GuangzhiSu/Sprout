import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const playerProfiles = sqliteTable("player_profiles", {
  userId: text("user_id").primaryKey(),
  initiationSkill: integer("initiation_skill").notNull().default(2),
  responseSkill: integer("response_skill").notNull().default(2),
  turnTaking: integer("turn_taking").notNull().default(2),
  conversationMaintenance: integer("conversation_maintenance").notNull().default(2),
  clarificationSkill: integer("clarification_skill").notNull().default(2),
  rejectionHandling: integer("rejection_handling").notNull().default(2),
  helpRequesting: integer("help_requesting").notNull().default(2),
  promptDependency: text("prompt_dependency").notNull().default("medium"),
  averageResponseLatencyMs: integer("average_response_latency_ms").notNull().default(0),
  preferredActivity: text("preferred_activity").notNull().default("building"),
  preferredTopicsJson: text("preferred_topics_json").notNull().default("[]"),
  toleratedConversationLength: integer("tolerated_conversation_length").notNull().default(5),
  toleratedNumberOfNpcs: integer("tolerated_number_of_npcs").notNull().default(2),
  recommendedDifficulty: integer("recommended_difficulty").notNull().default(2),
  sessionsCompleted: integer("sessions_completed").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const practiceSessions = sqliteTable("practice_sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  scenarioId: text("scenario_id").notNull(),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at").notNull(),
  difficulty: integer("difficulty").notNull(),
  suggestedNextDifficulty: integer("suggested_next_difficulty").notNull(),
  spontaneousInitiations: integer("spontaneous_initiations").notNull().default(0),
  highestPromptLevel: integer("highest_prompt_level").notNull().default(0),
  averagePromptLevelTenths: integer("average_prompt_level_tenths").notNull().default(0),
  averageResponseLatencyMs: integer("average_response_latency_ms").notNull().default(0),
  conversationalTurns: integer("conversational_turns").notNull().default(0),
  maintainedInteraction: integer("maintained_interaction", { mode: "boolean" }).notNull().default(false),
  clarificationAttempts: integer("clarification_attempts").notNull().default(0),
  successfulClarifications: integer("successful_clarifications").notNull().default(0),
  helpRequests: integer("help_requests").notNull().default(0),
  rejectionResponses: integer("rejection_responses").notNull().default(0),
  activityCompleted: integer("activity_completed", { mode: "boolean" }).notNull().default(false),
  exitStage: text("exit_stage").notNull(),
}, (table) => [
  index("idx_practice_sessions_user_ended").on(table.userId, table.endedAt),
]);

export const interactionTurns = sqliteTable("interaction_turns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  scenarioId: text("scenario_id").notNull(),
  stage: text("stage").notNull(),
  intent: text("intent").notNull(),
  socialGoalAchieved: text("social_goal_achieved").notNull(),
  promptLevel: integer("prompt_level").notNull(),
  responseLatencyMs: integer("response_latency_ms").notNull().default(0),
  clarificationNeeded: integer("clarification_needed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_interaction_turns_session").on(table.sessionId),
  index("idx_interaction_turns_user_created").on(table.userId, table.createdAt),
]);
