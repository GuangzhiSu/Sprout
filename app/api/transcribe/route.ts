// Speech-to-text stage of the practice pipeline: the child's recorded audio is
// transcribed by Groq's Whisper turbo model, and the client then sends the
// resulting text on to /api/coach (the Doubao/Ark text model).
const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Groq free-tier per-file limit.

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Voice transcription is not set up. You can type below instead." },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) {
      return Response.json({ error: "No audio was received." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_AUDIO_BYTES) {
      return Response.json({ error: "The recording is empty or too long." }, { status: 400 });
    }

    const model = process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo";
    const upstream = new FormData();
    upstream.append("file", file, file.name || "speech.webm");
    upstream.append("model", model);
    upstream.append("language", "en");
    upstream.append("response_format", "json");
    upstream.append("temperature", "0");

    const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: upstream,
    });

    const result = (await response.json()) as { text?: string; error?: { message?: string } };
    if (!response.ok) throw new Error(result.error?.message || "Transcription failed");

    const transcript = (result.text ?? "").trim().slice(0, 240);
    if (!transcript) return Response.json({ error: "I didn’t catch any words. Try again." }, { status: 422 });
    return Response.json({ transcript });
  } catch (error) {
    console.error("transcribe route failed", error instanceof Error ? error.message : error);
    return Response.json(
      { error: "Voice transcription is temporarily unavailable. Please type instead." },
      { status: 502 },
    );
  }
}
