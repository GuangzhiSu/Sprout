import { buildSessionSummary, createInitialScenarioState, defaultPlayerProfile, type ScenarioRuntimeState } from "@/lib/playground-engine";
import { authenticatedUserId, loadPlayerProgress, saveCompletedSession } from "@/lib/progress-store";
import { getScenario } from "@/lib/scenarios";

export async function GET(request: Request) {
  try {
    return Response.json(await loadPlayerProgress(authenticatedUserId(request)));
  } catch (error) {
    console.error("progress load unavailable", error instanceof Error ? error.message : error);
    return Response.json({ profile: defaultPlayerProfile, recentSessions: [], mode: "temporary" });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      scenarioId?: string;
      startedAt?: string;
      state?: ScenarioRuntimeState;
    };
    if (!body.sessionId || !/^[a-zA-Z0-9-]{8,80}$/.test(body.sessionId)) {
      return Response.json({ error: "A valid session ID is required." }, { status: 400 });
    }
    if (!getScenario(body.scenarioId ?? "")) {
      return Response.json({ error: "This scenario is not available." }, { status: 400 });
    }
    const state = body.state && typeof body.state === "object"
      ? body.state
      : createInitialScenarioState();
    const startedAt = body.startedAt && !Number.isNaN(Date.parse(body.startedAt))
      ? new Date(body.startedAt).toISOString()
      : new Date().toISOString();
    try {
      const summary = await saveCompletedSession({
        request,
        sessionId: body.sessionId,
        scenarioId: body.scenarioId!,
        startedAt,
        state,
      });
      return Response.json({ saved: true, summary });
    } catch (error) {
      console.error("progress save unavailable", error instanceof Error ? error.message : error);
      return Response.json({ saved: false, summary: buildSessionSummary(state), mode: "temporary" }, { status: 202 });
    }
  } catch (error) {
    console.error("progress route failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Progress could not be saved right now." }, { status: 502 });
  }
}
