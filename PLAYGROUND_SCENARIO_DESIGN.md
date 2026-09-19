# Playground Scenario Design

## 1. Scenario

The child arrives at a playground where Mia and Jordan are building a castle with large blocks. The child may join, watch, ask a question, suggest something else, or leave. The system follows a fixed learning sequence while adapting NPC initiative, turn count, ambiguity, and prompting.

This is structured practice, not an unrestricted chatbot. The scenario manager—not the language model—owns stage transitions, branches, difficulty, prompts, and completion.

## 2. Learning objectives

- Notice a shared activity and decide whether to interact.
- Approach or initiate in any understandable communication style.
- Ask to join, comment, greet, or ask a question.
- Respond, take turns, ask for help, and maintain several turns.
- Clarify after a misunderstanding.
- Navigate acceptance, hesitation, or rejection.
- Continue, switch, wait, watch, or leave naturally.

Exact wording, eye contact, masking, and neurotypical behaviour are never required.

## 3. NPCs

### Mia

- Age: 8–10
- Personality: friendly, direct, socially proactive
- Goal: finish the castle gate while keeping play moving
- Activity: building the gate
- Relationship: Jordan’s friend and building partner
- Initiative: direct invitation at Level 1; simple opening at Level 2; waits at Levels 3–4

### Jordan

- Age: 8–10
- Personality: quiet, focused, sometimes slow to notice a speaker
- Goal: make a tall tower without it falling
- Activity: sorting and testing blocks
- Relationship: Mia’s friend and building partner
- Initiative: short replies at Levels 1–2; natural distraction, ambiguity, or changed plans at Levels 3–4

## 4. State machine

```text
PLAYGROUND_START
  → OBSERVE
  → APPROACH
  → INITIATE
  → RESPOND
      ├─ ACCEPTED → PARTICIPATE
      ├─ MAYBE → CLARIFY / WAIT → PARTICIPATE
      ├─ REJECTED → HANDLE_REJECTION
      └─ UNCLEAR → REPAIR → previous stage
  → PARTICIPATE (difficulty controls number of turns)
  → UNEXPECTED_EVENT
      ├─ changed plan
      ├─ child was not heard
      ├─ structure falls
      └─ current role is full
  → DECIDE_NEXT
      ├─ CONTINUE
      ├─ SWITCH_ACTIVITY
      ├─ WAIT_OR_WATCH
      └─ EXIT
  → COMPLETE
```

An exit request may move to `COMPLETE` from any stage. Unclear communication stays in the current stage and opens a repair sequence rather than being marked wrong.

## 5. Difficulty levels

1. **Highly supported:** Mia directly invites the child, uses one short question at a time, and introduces no rejection or ambiguity.
2. **Guided initiation:** Mia says hello and names the activity but does not invite directly. The child practices expressing interest or asking to join.
3. **Independent initiation:** both NPCs keep building until the child initiates. The exchange is longer and Jordan may ask for clarification.
4. **Flexible social situation:** NPC initiative is low. One controlled unexpected event introduces a realistic limit, changed plan, “maybe later,” or alternative activity.

Only a small set of variables changes at once. Difficulty never changes in the middle of a session.

## 6. Prompt ladder

- Level 0 — no prompt; the child tries their own communication.
- Level 1 — environmental cue: “Mia and Jordan are building a block castle together.”
- Level 2 — intent cue: “If you want to play, you can let them know.”
- Level 3 — sentence starter: “You could start with: ‘Can I…’”
- Level 4 — three full examples representing different valid strategies.

The child requests each additional hint. Successful turns at prompt levels 0–1 fade support on the next turn; unclear turns may raise support by one level.

## 7. Personalization variables

```json
{
  "initiationSkill": 2,
  "responseSkill": 2,
  "turnTaking": 2,
  "conversationMaintenance": 2,
  "clarificationSkill": 2,
  "rejectionHandling": 2,
  "helpRequesting": 2,
  "promptDependency": "medium",
  "averageResponseLatencyMs": 0,
  "preferredActivity": "building",
  "preferredTopics": [],
  "toleratedConversationLength": 5,
  "toleratedNumberOfNpcs": 2,
  "recommendedDifficulty": 2
}
```

## 8. Adaptation rules

- Increase one level after completed sessions with at least four successful turns, average prompt level at or below 1, and manageable latency.
- Decrease one level after repeated prompt level 3–4 use, an early exit, or difficulty maintaining interaction.
- At higher levels, first reduce NPC initiative; only later increase turn count or ambiguity.
- At lower levels, shorten the exchange, let Mia lead, reduce ambiguity, and offer prompts earlier.
- Never infer a diagnosis, motivation, or emotional state from performance.

## 9. Tracking metrics

- spontaneous initiations
- highest and average prompt level
- response latency
- conversational turns
- maintained interaction
- clarification attempts and successful repairs
- help requests
- responses to rejection
- activity completion
- difficulty level and suggested next difficulty
- user preferences
- exit stage

Raw child transcripts are not stored in the progress database. The system stores structured interaction events and session aggregates.

## 10. Intent categories

`join_play`, `greet`, `respond_to_question`, `ask_question`, `ask_for_help`, `clarify`, `reject_offer`, `accept_offer`, `suggest_activity`, `continue_play`, `exit_interaction`, `respond_to_rejection`, `unclear`.

## 11. Structured states

```json
{
  "intent": "join_play",
  "interactionStage": "initiate",
  "socialGoalAchieved": true,
  "needsPrompt": false,
  "promptLevel": 0,
  "responseLatencyMs": 6200,
  "clarificationNeeded": false,
  "possibleNextStage": "respond"
}
```

```json
{
  "stage": "unexpected",
  "difficulty": 4,
  "promptLevel": 1,
  "branch": "rejected",
  "speaker": "Jordan",
  "turnCount": 6,
  "turnsInStage": 0,
  "recentIndependentSuccesses": 2
}
```

## 12. Example conversations

### Beginner

Mia: “Hi! We’re building a castle. Want to help?”

Child: “Yes.”

Mia: “Okay! Can you put this blue block by the gate?”

Child: “Here?”

Mia: “Yes, right there.”

Child: “Done.”

Mia: “Thanks. Want to add one more or stop?”

Child: “Stop.”

Mia: “Okay. Bye!”

### Intermediate

Mia: “Hey! We’re making a castle.”

Child: “What are you building?”

Mia: “A gate. What part do you want to make?”

Child: “Can I make a tower?”

Jordan: “Sure. Can you pass the square block first?”

Child: “This one?”

Jordan: “Yes, that one.”

Child: “Here you go.”

### Advanced

Mia: “Jordan, let’s make the gate taller.”

Child: “That looks fun. Can I build too?”

Mia: “Maybe. What part did you want to build?”

Child: “I could make a bridge.”

Jordan: “This side is full right now.”

Child: “Okay. Could I build the bridge beside it?”

Jordan: “Yeah, that works.”

Child: “Can you pass me two long blocks?”

Mia: “Sure.”

## 13. Rejection branch

Child: “Can I build the tower?”

Jordan: “This part is full right now. Maybe later.”

Child: “Okay. Can I build beside you?”

Jordan: “Yes. You could make a bridge.”

Also valid: “Okay,” waiting, watching, choosing chalk, or leaving.

## 14. Clarification branch

Child: “Blue there.”

Jordan: “Sorry, I didn’t hear you. Did you ask about the blue block?”

Child: “Yes. Does it go here?”

Jordan: “Yes, by the gate.”

The repair is tracked separately from the original unclear turn.

## 15. Increasing difficulty across sessions

- Session 1, Level 1: prompt level 3, three turns, clear response to Mia.
- Session 2, Level 1: prompt level 1, four turns, spontaneous question.
- Session 3, Level 2: prompt level 0–1, five turns, asks for clarification.
- Session 4 recommendation: Level 3, with lower NPC initiative and one extra play turn.

## 16. Decreasing difficulty

- Level 3 session: child requests prompt level 4 twice and exits during initiation.
- Next recommendation: Level 2.
- Mia provides a clear opening, the interaction is shorter, and ambiguity is removed.
- Skill estimates are adjusted gradually; the session is not labelled a failure.

## 17. Backend architecture

```text
Browser UI
  ├─ speech recognition / typed input
  ├─ prompt ladder and stage display
  └─ hidden visual safety sampling
        ↓
Interaction Analyzer (Doubao, constrained JSON)
        ↓ intent only
Deterministic Scenario Manager
  ├─ stage and branch transition
  ├─ prompt fading
  ├─ difficulty constraints
  └─ completion rules
        ↓ structured instruction
NPC Language Model (Doubao, constrained JSON)
        ↓
Short in-character reply + optional examples

D1 persistence
  ├─ player profile
  ├─ interaction event metrics (no transcript)
  └─ session summaries
```

The visual safety route is separate from conversational progression and cannot diagnose emotion or health.

## 18. Data schema

- `player_profiles`: one record per authenticated user with seven skill estimates, prompt dependency, latency, preferences, tolerance, recommended difficulty, and timestamps.
- `practice_sessions`: one aggregate record per session with prompt, latency, turn, clarification, help, rejection, completion, and exit metrics.
- `interaction_turns`: structured per-turn intent and stage metrics without the child’s raw words.
- Indexes support recent sessions by user and turns by session/user.

## 19. NPC system prompt

```text
You are the NPC Language Model in a structured child-centered practice game.
The Scenario Manager has already chosen the stage, branch, difficulty, speaker,
and required move. You may choose natural wording only; do not change those controls.

Sound like a child, not a therapist. Use one or two short sentences. Respond to
meaning rather than grammar. Never praise or grade a social skill, require eye
contact, lecture, diagnose, or tell the child to act normal. Keep acceptance,
hesitation, rejection, clarification, switching, waiting, and leaving available.
Return strict JSON with npcReply, coachNote, and three short suggestions.
```

## 20. Orchestration pseudocode

```text
on_child_response(text, state, profile):
    latency = now - turn_started_at

    analysis = interaction_analyzer.classify(
        text=text,
        allowed_intents=INTENTS,
        current_stage=state.stage,
        current_branch=state.branch
    )

    # The model does not control this transition.
    next_state = scenario_manager.advance(
        state=state,
        intent=analysis.intent,
        goal_progress=evaluate_goal(state.stage, analysis.intent),
        difficulty=state.difficulty
    )

    next_state.prompt_level = prompt_manager.fade_or_increase(
        previous=state.prompt_level,
        successful=analysis.social_goal_achieved,
        requested_help=user_requested_hint
    )

    npc_instruction = scenario_manager.required_npc_move(next_state)
    language = npc_model.generate(
        npc=npc_for(next_state),
        required_move=npc_instruction,
        child_intent=analysis.intent,
        recent_context=last_few_turns
    )

    progress_store.record_structured_turn(analysis, next_state, latency)

    if next_state.stage == COMPLETE:
        summary = player_model.finish_session(next_state.metrics)
        progress_store.save_summary(summary)
        profile = player_model.update_gradually(profile, summary)

    return next_state, language, profile
```

The production implementation lives in `lib/playground-engine.ts`, `app/api/coach/route.ts`, and `lib/progress-store.ts`.
