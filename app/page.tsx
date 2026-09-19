"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Check,
  HeartHandshake,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Suggestion = { text: string; intent: string };

type CoachResponse = {
  heard: string;
  coachNote: string;
  suggestions: Suggestion[];
  peerReply: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface Document {
    modelContext?: {
      registerTool: (
        tool: {
          name: string;
          title?: string;
          description: string;
          inputSchema: Record<string, unknown>;
          annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
          execute: (input: unknown) => unknown | Promise<unknown>;
        },
        options?: { signal?: AbortSignal },
      ) => void | Promise<void>;
    };
  }
}

const openingSuggestions: Suggestion[] = [
  { text: "Can I play with you?", intent: "Join in" },
  { text: "What are you building?", intent: "Ask first" },
  { text: "I like blocks too.", intent: "Share interest" },
];

const openingCoach: CoachResponse = {
  heard: "",
  coachNote: "First, notice what they are doing. Then choose one thing you would like to say.",
  suggestions: openingSuggestions,
  peerReply: "We’re building a castle!",
};

export default function Home() {
  const [coach, setCoach] = useState<CoachResponse>(openingCoach);
  const [typedText, setTypedText] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [monitorPaused, setMonitorPaused] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyReason, setSafetyReason] = useState("You may need a short break.");
  const [lastChecked, setLastChecked] = useState("Not started");
  const [chosen, setChosen] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingRef = useRef(false);

  const requestCoach = useCallback(async (transcript: string) => {
    const clean = transcript.trim();
    if (!clean) return;
    setThinking(true);
    setChosen(null);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: clean,
          context: {
            scenario: "Playground: joining peers who are building with blocks",
            peerSaid: coach.peerReply,
          },
        }),
      });
      const result = (await response.json()) as CoachResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "No response received");
      setCoach(result);
      setNotice(null);
    } catch {
      setCoach({
        heard: clean,
        coachNote: "You spoke up. Try a short sentence, then give the other person time to answer.",
        suggestions: openingSuggestions,
        peerReply: "Sure! Which part would you like to build?",
      });
      setNotice("The connection is unstable, so we kept a few practice ideas ready.");
    } finally {
      setThinking(false);
    }
  }, [coach.peerReply]);

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice recognition is not available in this browser. You can type below instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join("")
        .trim();
      setTypedText(transcript);
      void requestCoach(transcript);
    };
    recognition.onerror = () => {
      setNotice("I didn’t catch that. Try again, or type your words below.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    setNotice(null);
    recognition.start();
  };

  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !cameraOn || monitorPaused || checkingRef.current) return;
    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) return;
    checkingRef.current = true;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 480;
      canvas.height = Math.round((480 * video.videoHeight) / video.videoWidth);
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.68);
      const response = await fetch("/api/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl }),
      });
      const result = (await response.json()) as {
        alert?: boolean;
        reason?: string;
        confidence?: number;
      };
      setLastChecked("Checked just now");
      if (response.ok && result.alert) {
        setSafetyReason(result.reason || "You may need a short break.");
        setSafetyOpen(true);
        setMonitorPaused(true);
      }
    } catch {
      setLastChecked("Check unavailable");
    } finally {
      checkingRef.current = false;
    }
  }, [cameraOn, monitorPaused]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (safetyTimerRef.current) clearInterval(safetyTimerRef.current);
    safetyTimerRef.current = null;
    setCameraOn(false);
    setLastChecked("Not started");
  }, []);

  const startCamera = async () => {
    if (cameraOn) {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setMonitorPaused(false);
      setLastChecked("Getting ready");
      setNotice(null);
    } catch {
      setNotice("The camera is unavailable. Check browser permission and try again.");
    }
  };

  useEffect(() => {
    if (!cameraOn || monitorPaused) return;
    const firstCheck = setTimeout(() => void analyzeFrame(), 1800);
    safetyTimerRef.current = setInterval(() => void analyzeFrame(), 10000);
    return () => {
      clearTimeout(firstCheck);
      if (safetyTimerRef.current) clearInterval(safetyTimerRef.current);
      safetyTimerRef.current = null;
    };
  }, [analyzeFrame, cameraOn, monitorPaused]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: "start_playground_practice",
        title: "Start playground practice",
        description: "Reset and start the playground peer-communication practice with the current mission and opening reply suggestions.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => {
          if (
            input === null ||
            typeof input !== "object" ||
            Array.isArray(input) ||
            Object.keys(input as Record<string, unknown>).length > 0
          ) {
            throw new Error("This action does not accept input.");
          }
          setCoach(openingCoach);
          setChosen(null);
          setSessionEnded(false);
          return { scenario: "playground", status: "ready" };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch {
      // WebMCP is optional and unsupported browsers continue normally.
    }
    return () => lifecycle.abort();
  }, []);

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    void requestCoach(typedText);
  };

  const speakSuggestion = (suggestion: Suggestion) => {
    setChosen(suggestion.text);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(suggestion.text);
      utterance.lang = "en-US";
      utterance.rate = 0.86;
      window.speechSynthesis.speak(utterance);
    }
    setCoach((current) => ({
      ...current,
      peerReply: suggestion.text.includes("play")
        ? "Sure! You can help us build the gate."
        : "We’re building a castle. Want to see?",
    }));
  };

  const endSession = () => {
    stopCamera();
    recognitionRef.current?.stop();
    setSessionEnded(true);
    setSafetyOpen(false);
  };

  if (sessionEnded) {
    return (
      <main className="session-end">
        <div className="session-end__card">
          <div className="session-end__icon"><HeartHandshake aria-hidden="true" /></div>
          <p className="eyebrow">Today’s practice is finished</p>
          <h1>You did something brave today</h1>
          <p>Taking a break matters too. We can practice together again whenever you’re ready.</p>
          <button className="primary-button" onClick={() => {
            setSessionEnded(false);
            setCoach(openingCoach);
            setChosen(null);
            setTypedText("");
          }}>
            <RotateCcw aria-hidden="true" /> Start again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="scenario-shell">
      <img className="scenario-bg" src="/playground-scene.png" alt="A sunny playground where two children build with blocks as another child walks toward them" />
      <div className="scenario-wash" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><Sparkles aria-hidden="true" /></span>
          <div>
            <strong>Play Together</strong>
            <span>Social communication practice</span>
          </div>
        </div>
        <div className="scenario-title">
          <span>Scenario 01</span>
          <strong>Meet new friends at the playground</strong>
        </div>
        <div className="status-row" aria-label="Device status">
          <span className={listening ? "status-pill status-pill--active" : "status-pill"}>
            {listening ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
            {listening ? "Listening" : "Mic ready"}
          </span>
          <span className={cameraOn && !monitorPaused ? "status-pill status-pill--safe" : "status-pill"}>
            {cameraOn ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
            {cameraOn ? (monitorPaused ? "Monitor paused" : "Safety monitor on") : "Monitor off"}
          </span>
        </div>
      </header>

      <section className="scene-content" aria-label="Playground practice scene">
        <aside className="mission-card glass-card">
          <div className="mission-card__topline">
            <span className="step-number">1</span>
            <span>Your mission</span>
          </div>
          <h2>Walk over and say hello</h2>
          <ul>
            <li><Check aria-hidden="true" /> Notice what they are playing</li>
            <li><Check aria-hidden="true" /> Choose one thing to say</li>
            <li><Check aria-hidden="true" /> Wait for their answer</li>
          </ul>
          <p className="mission-note">Take your time. You can pause whenever you need.</p>
        </aside>

        <div className="peer-bubble" role="status" aria-live="polite">
          <span>Your new friend says</span>
          <p>“{coach.peerReply}”</p>
        </div>

        <aside className="safety-card glass-card" aria-label="Safety monitor">
          <div className="safety-card__heading">
            <div><ShieldCheck aria-hidden="true" /><strong>Safety companion</strong></div>
            <button className="icon-button" onClick={() => void startCamera()} aria-label={cameraOn ? "Turn off camera" : "Turn on camera"}>
              {cameraOn ? <CameraOff aria-hidden="true" /> : <Camera aria-hidden="true" />}
            </button>
          </div>
          <div className={cameraOn ? "camera-frame camera-frame--on" : "camera-frame"}>
            <video ref={videoRef} muted playsInline aria-label="Safety-monitor camera preview" />
            {!cameraOn && (
              <button onClick={() => void startCamera()}>
                <Camera aria-hidden="true" />
                <span>Start visual check</span>
              </button>
            )}
          </div>
          <div className="safety-meta">
            <span>{lastChecked}</span>
            {cameraOn && (
              <button onClick={() => setMonitorPaused((value) => !value)}>
                {monitorPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                {monitorPaused ? "Resume" : "Pause"}
              </button>
            )}
          </div>
          <p>Supportive alerts only. This does not replace a caregiver or professional judgment.</p>
        </aside>
      </section>

      <section className="coach-dock" aria-label="Communication coach">
        <div className="coach-lead">
          <div className={thinking ? "coach-orb coach-orb--thinking" : "coach-orb"}>
            <Sparkles aria-hidden="true" />
          </div>
          <div>
            <span className="coach-label">Communication coach</span>
            <p>{thinking ? "I’m finding words that are easy to say…" : coach.coachNote}</p>
            {coach.heard && <small>I heard: {coach.heard}</small>}
          </div>
        </div>

        <div className="suggestion-grid" aria-live="polite" aria-busy={thinking}>
          {coach.suggestions.slice(0, 3).map((suggestion) => (
            <button
              key={`${suggestion.intent}-${suggestion.text}`}
              className={chosen === suggestion.text ? "suggestion-card suggestion-card--chosen" : "suggestion-card"}
              onClick={() => speakSuggestion(suggestion)}
              disabled={thinking}
            >
              <span>{suggestion.intent}</span>
              <strong>“{suggestion.text}”</strong>
              <small><Volume2 aria-hidden="true" /> Tap to hear it</small>
            </button>
          ))}
        </div>

        <div className="voice-row">
          <button className={listening ? "mic-button mic-button--active" : "mic-button"} onClick={startListening} aria-pressed={listening}>
            {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
            <span>{listening ? "Tap to stop" : "Press, then say what you think"}</span>
          </button>
          <form onSubmit={submitText}>
            <label htmlFor="practice-input" className="sr-only">Type what you want to say</label>
            <input
              id="practice-input"
              value={typedText}
              onChange={(event) => setTypedText(event.target.value)}
              placeholder="Or type what you want to say…"
              maxLength={120}
            />
            <button type="submit" disabled={!typedText.trim() || thinking}>Get ideas</button>
          </form>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
      </section>

      <AlertDialog open={safetyOpen} onOpenChange={setSafetyOpen}>
        <AlertDialogContent className="safety-dialog">
          <AlertDialogHeader>
            <AlertDialogMedia className="safety-dialog__icon"><HeartHandshake aria-hidden="true" /></AlertDialogMedia>
            <AlertDialogTitle>We can pause here</AlertDialogTitle>
            <AlertDialogDescription>
              If you’re not feeling okay, we can stop and try again another time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="safety-dialog__reason">{safetyReason}</p>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMonitorPaused(false)}>I want to keep trying</AlertDialogCancel>
            <AlertDialogAction onClick={endSession}>Stop and rest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
