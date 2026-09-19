"""Standalone test for the voice-input step used by the website.

The production path lives in app/api/transcribe/route.ts: the child's recorded
audio is transcribed by Groq's Whisper turbo model, and the transcript is then
sent to the Ark coach model (app/api/coach/route.ts). This script exercises the
speech-to-text step on its own for quick local checks.
"""
import os
import time
import logging

from dotenv import load_dotenv
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
load_dotenv()

# Groq is OpenAI-compatible, so the same SDK works against its base URL.
groq = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.environ.get("GROQ_API_KEY"),
)


def transcribe(audio_path: str) -> str:
    begin_time = time.time()
    with open(audio_path, "rb") as f:
        result = groq.audio.transcriptions.create(
            model=os.environ.get("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3-turbo"),
            file=f,
            language="en",
            temperature=0,
        )
    logging.info(f"Transcription complete in {time.time() - begin_time:.3f}s")
    return result.text.strip()


if __name__ == "__main__":
    transcript = transcribe("/home/julianzbk/julia/Music/autismo.mp3")
    logging.info(f"Transcript: {transcript}")
