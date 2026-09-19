import { getScenario, type ScenarioDefinition } from "@/lib/scenarios";

function buildSafetyPrompt(scenario: ScenarioDefinition) {
  return `You are a conservative visual safety notifier for an autistic child's communication practice. You may describe only behavior that is clearly observable in the current single frame. You must not diagnose emotion, illness, or intent.

Scenario context: ${scenario.modelContext.safety}

Clear signals to consider include visible crying or a strong expression of pain, tightly covering both ears while clearly withdrawing, curling up or hiding, an ongoing self-injurious action, a fall, or an obvious hazard that needs immediate adult attention. A neutral expression, looking away, small movements, lack of eye contact, hand position, or simply leaving the frame must never trigger an alert on its own.

Set alert to true only when evidence is clear and confidence is at least 0.75. When uncertain, alert must be false.
Return strict JSON only, with no Markdown:
{"alert":false,"confidence":0.0,"signals":["observable signal"],"reason":"brief, non-diagnostic note for the caregiver"}`;
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Invalid model response");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scenarioId?: string; imageDataUrl?: string };
    const scenario = getScenario(body.scenarioId ?? "");
    if (!scenario) return Response.json({ error: "This scenario is not available." }, { status: 400 });

    const imageDataUrl = body.imageDataUrl ?? "";
    if (!imageDataUrl.startsWith("data:image/") || imageDataUrl.length > 2_800_000) {
      return Response.json({ error: "The image format is invalid." }, { status: 400 });
    }

    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      return Response.json({ alert: false, confidence: 0, signals: [], reason: "No concern was found in demo mode.", mode: "demo" });
    }

    const model = process.env.ARK_VISION_MODEL || process.env.ARK_MODEL || "doubao-seed-2-0-lite-260215";
    const response = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildSafetyPrompt(scenario) },
          {
            role: "user",
            content: [
              { type: "text", text: "Check this frame for clear, observable signals that warrant pausing practice and asking a caregiver to pay attention." },
              { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 260,
      }),
    });

    const result = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(result.error?.message || "Vision request failed");
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("Vision model returned no content");
    const parsed = extractJson(content);
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    const signals = Array.isArray(parsed.signals)
      ? parsed.signals.map(String).slice(0, 4)
      : [];
    const alert = parsed.alert === true && confidence >= 0.75 && signals.length > 0;
    return Response.json({
      alert,
      confidence,
      signals,
      reason: alert
        ? String(parsed.reason || "A clear concern was observed. Pause and ask a caregiver to check in.").slice(0, 200)
        : "No clear signal requiring an immediate pause was found.",
    });
  } catch (error) {
    console.error("safety route failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "The safety monitor is temporarily unavailable." }, { status: 502 });
  }
}
