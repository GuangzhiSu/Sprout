import { getScenario, type ScenarioDefinition } from "@/lib/scenarios";

function buildSystemPrompt(scenario: ScenarioDefinition) {
  return `You are a scenario coach helping an autistic child practice social communication.

Current scene: ${scenario.modelContext.scene}
Practice goal: ${scenario.modelContext.goal}

Principles:
1. Respect the child's choice. Never require eye contact, physical contact, or continued interaction.
2. Use direct, concrete, friendly English. Do not infantilize, judge, or make medical claims.
3. Keep coaching brief, concrete, and easy to understand. Do not offer reply options.
4. If the child says no, feels afraid, says it is too loud, or wants to leave, prioritize self-advocacy and exit language.
5. Keep the peer's reply natural and brief so the conversation can continue.

Return strict JSON only, with no Markdown:
{"heard":"brief restatement","coachNote":"one gentle and specific coaching sentence","peerReply":"one natural reply from the peer"}`;
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid model response");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function normalize(payload: Record<string, unknown>, heard: string, scenario: ScenarioDefinition) {
  return {
    heard: String(payload.heard ?? heard).trim().slice(0, 120),
    coachNote: String(payload.coachNote ?? scenario.fallback.coachNote).trim().slice(0, 160),
    peerReply: String(payload.peerReply ?? scenario.fallback.peerReply).trim().slice(0, 120),
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      scenarioId?: string;
      transcript?: string;
      context?: { peerSaid?: string };
    };
    const scenario = getScenario(body.scenarioId ?? "");
    if (!scenario) return Response.json({ error: "This scenario is not available." }, { status: 400 });

    const transcript = body.transcript?.trim().slice(0, 240) ?? "";
    if (!transcript) return Response.json({ error: "Say or type something first." }, { status: 400 });

    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      return Response.json({
        heard: transcript,
        coachNote: scenario.fallback.coachNote,
        peerReply: scenario.fallback.peerReply,
        mode: "demo",
      });
    }

    const model = process.env.ARK_MODEL || "doubao-seed-2-0-lite-260215";
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSystemPrompt(scenario) },
          {
            role: "user",
            content: `Scene: ${scenario.modelContext.scene}\nPractice goal: ${scenario.modelContext.goal}\nThe peer just said: ${body.context?.peerSaid || scenario.opening.peerReply}\nThe child said: ${transcript}`,
          },
        ],
        temperature: 0.35,
        max_tokens: 500,
      }),
    });

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(result.error?.message || "Doubao request failed");
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Doubao returned no content");
    return Response.json(normalize(extractJson(content), transcript, scenario));
  } catch (error) {
    console.error("coach route failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Communication coach is temporarily unavailable. Please try again." }, { status: 502 });
  }
}
