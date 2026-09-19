"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  LogOut,
  HeartHandshake,
  Mic,
  MicOff,
  RotateCcw,
  Sprout,
  Volume2,
  VolumeX,
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
import { markCourseComplete } from "@/lib/progress";
import { playgroundScenario } from "@/lib/scenarios";

type CoachResponse = {
  heard: string;
  coachNote: string;
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

const scenario = playgroundScenario;

const openingCoach: CoachResponse = {
  heard: "",
  coachNote: scenario.opening.coachNote,
  peerReply: scenario.opening.peerReply,
};

export default function Home() {
  const [coach, setCoach] = useState<CoachResponse>(openingCoach);
  const [conversation, setConversation] = useState<CoachResponse[]>([openingCoach]);
  const [typedText, setTypedText] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [monitorPaused, setMonitorPaused] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyReason, setSafetyReason] = useState("You may need a short break.");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [backgroundMuted, setBackgroundMuted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingRef = useRef(false);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const config = scenario.backgroundAudio;
    if (sessionEnded || !config) return;
    const audio = new Audio(config.src);
    audio.loop = true;
    audio.volume = config.volume;
    audio.preload = "none";
    backgroundAudioRef.current = audio;
    let disposed = false;
    const removeInteractionListeners = () => {
      document.removeEventListener("click", start, true);
      document.removeEventListener("keydown", start, true);
    };
    const start = () => {
      if (disposed) return;
      void audio.play().then(() => {
        if (disposed) audio.pause();
        else removeInteractionListeners();
      }).catch(() => {
        // A missing optional track or autoplay denial must not interrupt practice.
      });
    };
    const stop = () => {
      disposed = true;
      removeInteractionListeners();
      audio.pause();
      audio.currentTime = 0;
    };
    document.addEventListener("click", start, true);
    document.addEventListener("keydown", start, true);
    window.addEventListener("pagehide", stop);
    return () => {
      stop();
      window.removeEventListener("pagehide", stop);
      audio.removeAttribute("src");
      audio.load();
      backgroundAudioRef.current = null;
    };
  }, [sessionEnded]);

  useEffect(() => {
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.muted = backgroundMuted;
    }
  }, [backgroundMuted, sessionEnded]);

  const toggleBackgroundMuted = () => {
    const muted = !backgroundMuted;
    if (backgroundAudioRef.current) backgroundAudioRef.current.muted = muted;
    setBackgroundMuted(muted);
  };

  useEffect(() => {
    const log = conversationRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [conversation]);

  const requestCoach = useCallback(async (transcript: string) => {
    const clean = transcript.trim();
    if (!clean) return;
    setThinking(true);
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          transcript: clean,
          context: {
            peerSaid: coach.peerReply,
          },
        }),
      });
      const result = (await response.json()) as CoachResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "No response received");
      setCoach(result);
      setConversation((current) => [...current, { ...result, heard: clean }]);
      setNotice(null);
    } catch {
      const fallback = {
        heard: clean,
        coachNote: scenario.fallback.coachNote,
        peerReply: scenario.fallback.peerReply,
      };
      setCoach(fallback);
      setConversation((current) => [...current, fallback]);
      setNotice("The connection is unstable. Showing an offline practice reply.");
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
        body: JSON.stringify({ scenarioId: scenario.id, imageDataUrl }),
      });
      const result = (await response.json()) as {
        alert?: boolean;
        reason?: string;
        confidence?: number;
      };
      if (response.ok && result.alert) {
        setSafetyReason(result.reason || "You may need a short break.");
        setSafetyOpen(true);
        setMonitorPaused(true);
      }
    } catch {
      // The background monitor stays unobtrusive when a check is unavailable.
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
  }, []);

  useEffect(() => {
    if (sessionEnded || !navigator.mediaDevices?.getUserMedia) return;
    let cancelled = false;
    let activeStream: MediaStream | null = null;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        // Permission can resolve after Exit or after this page has unmounted.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        activeStream = stream;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (!cancelled) {
          setCameraOn(true);
          setMonitorPaused(false);
        }
      } catch {
        // Camera access is optional. Do not interrupt the practice experience.
      }
    };
    void start();
    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === activeStream) streamRef.current = null;
    };
  }, [sessionEnded]);

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
        description: "Reset and start the playground peer-communication practice with the opening conversation.",
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
          setConversation([openingCoach]);
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

  const endSession = () => {
    backgroundAudioRef.current?.pause();
    stopCamera();
    recognitionRef.current?.stop();
    // Reaching the end opens the next card on the student dashboard.
    markCourseComplete(scenario.id);
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
            setConversation([openingCoach]);
            setTypedText("");
          }}>
            <RotateCcw aria-hidden="true" /> Start again
          </button>
          <a className="session-end__back" href="/student">Back to scenarios</a>
        </div>
      </main>
    );
  }

  return (
    <main className="scenario-shell">
      <video ref={videoRef} className="background-monitor-video" muted playsInline aria-hidden="true" />

      <header className="topbar">
        <button className="exit-button" onClick={endSession}>
          <LogOut aria-hidden="true" /> Exit
        </button>
        <div className="status-row" aria-label="Device status">
          <button
            type="button"
            className="icon-button"
            onClick={toggleBackgroundMuted}
            aria-label="Mute background audio"
            aria-pressed={backgroundMuted}
            title={backgroundMuted ? "Unmute background audio" : "Mute background audio"}
          >
            {backgroundMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
          <span className={listening ? "status-pill status-pill--active" : "status-pill"}>
            {listening ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
            {listening ? "Listening" : "Mic ready"}
          </span>
          <span className={cameraOn && !monitorPaused ? "status-pill status-pill--safe" : "status-pill"}>
            {cameraOn ? <Camera aria-hidden="true" /> : <CameraOff aria-hidden="true" />}
            {cameraOn ? (monitorPaused ? "Monitor paused" : "Monitor on") : "Monitor off"}
          </span>
        </div>
      </header>

      <section className="scene-content" aria-label={scenario.sceneAriaLabel}>
        <img className="scenario-bg" src={scenario.image.src} alt={scenario.image.alt} />
        <div className="peer-bubble" role="status" aria-live="polite">
          <span>{scenario.opening.peerLabel}</span>
          <p>“{coach.peerReply}”</p>
        </div>

      </section>

      <section className="coach-dock" aria-label="Communication coach">
        <h2 className="coach-label"><Sprout aria-hidden="true" /> Communication coach</h2>
        <div className="conversation-log" role="log" aria-label="Conversation history" aria-busy={thinking} ref={conversationRef}>
          {conversation.map((turn, index) => (
            <div className="conversation-turn" key={index}>
              {turn.heard && <p><strong>You:</strong> {turn.heard}</p>}
              <p><strong>Friend:</strong> {turn.peerReply}</p>
              <p className="coach-note"><strong>Coach:</strong> {turn.coachNote}</p>
            </div>
          ))}
        </div>
        {thinking && <p className="coach-note" role="status">Thinking...</p>}

        <div className="voice-row">
          <button className={listening ? "mic-button mic-button--active" : "mic-button"} onClick={startListening} aria-pressed={listening} disabled={thinking}>
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
            <button type="submit" disabled={!typedText.trim() || thinking}>Send</button>
          </form>
        </div>
        {notice && <p className="notice" role="status">{notice}</p>}
      </section>

      <AlertDialog open={safetyOpen} onOpenChange={(open) => {
        setSafetyOpen(open);
        if (!open) setMonitorPaused(false);
      }}>
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
