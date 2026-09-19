CREATE TABLE `interaction_turns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scenario_id` text NOT NULL,
	`stage` text NOT NULL,
	`intent` text NOT NULL,
	`social_goal_achieved` text NOT NULL,
	`prompt_level` integer NOT NULL,
	`response_latency_ms` integer DEFAULT 0 NOT NULL,
	`clarification_needed` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_interaction_turns_session` ON `interaction_turns` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_interaction_turns_user_created` ON `interaction_turns` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `player_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`initiation_skill` integer DEFAULT 2 NOT NULL,
	`response_skill` integer DEFAULT 2 NOT NULL,
	`turn_taking` integer DEFAULT 2 NOT NULL,
	`conversation_maintenance` integer DEFAULT 2 NOT NULL,
	`clarification_skill` integer DEFAULT 2 NOT NULL,
	`rejection_handling` integer DEFAULT 2 NOT NULL,
	`help_requesting` integer DEFAULT 2 NOT NULL,
	`prompt_dependency` text DEFAULT 'medium' NOT NULL,
	`average_response_latency_ms` integer DEFAULT 0 NOT NULL,
	`preferred_activity` text DEFAULT 'building' NOT NULL,
	`preferred_topics_json` text DEFAULT '[]' NOT NULL,
	`tolerated_conversation_length` integer DEFAULT 5 NOT NULL,
	`tolerated_number_of_npcs` integer DEFAULT 2 NOT NULL,
	`recommended_difficulty` integer DEFAULT 2 NOT NULL,
	`sessions_completed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scenario_id` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text NOT NULL,
	`difficulty` integer NOT NULL,
	`suggested_next_difficulty` integer NOT NULL,
	`spontaneous_initiations` integer DEFAULT 0 NOT NULL,
	`highest_prompt_level` integer DEFAULT 0 NOT NULL,
	`average_prompt_level_tenths` integer DEFAULT 0 NOT NULL,
	`average_response_latency_ms` integer DEFAULT 0 NOT NULL,
	`conversational_turns` integer DEFAULT 0 NOT NULL,
	`maintained_interaction` integer DEFAULT false NOT NULL,
	`clarification_attempts` integer DEFAULT 0 NOT NULL,
	`successful_clarifications` integer DEFAULT 0 NOT NULL,
	`help_requests` integer DEFAULT 0 NOT NULL,
	`rejection_responses` integer DEFAULT 0 NOT NULL,
	`activity_completed` integer DEFAULT false NOT NULL,
	`exit_stage` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_practice_sessions_user_ended` ON `practice_sessions` (`user_id`,`ended_at`);