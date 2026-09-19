"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  HeartHandshake,
  HelpCircle,
  LogOut,
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
import {
  buildSessionSummary,
  clampPromptLevel,
  createInitialScenarioState,
  defaultPlayerProfile,
  getPromptSupport,
  getStageDefinition,
  stageDefinitions,
  type InteractionAnalysis,
  type PlayerProfile,
  type ScenarioRuntimeState,
  type SessionSummary,
} from "@/lib/playground-engine";
import { markCourseComplete } from "@/lib/progress";
import { getDifficulty, playgroundScenario } from "@/lib/scenarios";

type Suggestion = { text: string; intent: string };

type CoachResponse = {
  heard: string;
  npcName: string;
  coachNote: string;
  peerReply: string;
  suggestions: Suggestion[];
  prompt: ReturnType<typeof getPromptSupport>;
  state: ScenarioRuntimeState;
  analysis?: InteractionAnalysis;
  complete?: boolean;
};

type ConversationTurn = {
  heard: string;
  npcName: string;
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

function makeOpening(difficultyLevel: 1 | 2 | 3 | 4) {
  const difficulty = getDifficulty(scenario, difficultyLevel);
  const state = createInitialScenarioState(difficultyLevel);
  const response: CoachResponse = {
    heard: "",
    npcName: difficulty.openingSpeaker,
    coachNote: difficulty.openingCoachNote,
    peerReply: difficulty.openingReply,
    suggestions: [],
    prompt: getPromptSupport(state.stage, state.promptLevel),
    state,
  };
  return { state, response };
}

const initial = makeOpening(2);

function newSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function PlaygroundPractice() {
  const router = useRouter();
  const [profile, setProfile] = useState<PlayerProfile>(defaultPlayerProfile);
  const [runtimeState, setRuntimeState] = useState<ScenarioRuntimeState>(initial.state);
  const [coach, setCoach] = useState<CoachResponse>(initial.response);
  const [conversation, setConversation] = useState<ConversationTurn[]>([
    { heard: "", npcName: initial.response.npcName, peerReply: initial.response.peerReply },
  ]);
  const [typedText, setTypedText] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [monitorPaused, setMonitorPaused] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetyReason, setSafetyReason] = useState("You may need a short break.");
  const [sessionEnded, setSessionEnded] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [backgroundMuted, setBackgroundMuted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingRef = useRef(false);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef("");
  const sessionStartedAtRef = useRef(new Date().toISOString());
  const turnStartedAtRef = useRef(Date.now());

  const resetSession = useCallback((difficulty: 1 | 2 | 3 | 4) => {
    const opening = makeOpening(difficulty);
    sessionIdRef.current = newSessionId();
    sessionStartedAtRef.current = new Date().toISOString();
    turnStartedAtRef.current = Date.now();
    setRuntimeState(opening.state);
    setCoach(opening.response);
    setConversation([{ heard: "", npcName: opening.response.npcName, peerReply: opening.response.peerReply }]);
    setTypedText("");
    setSummary(null);
    setSessionEnded(false);
    setNotice(null);
  }, []);

  useEffect(() => {
    sessionIdRef.current = newSessionId();
    void fetch("/api/progress")
      .then(async (response): Promise<{ profile?: PlayerProfile } | null> => (
        response.ok ? await response.json() as { profile?: PlayerProfile } : null
      ))
      .then((result) => {
        if (!result?.profile) return;
        setProfile(result.profile);
        resetSession(result.profile.recommendedDifficulty);
      })
      .catch(() => undefined);
  }, [resetSession]);

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
      }).catch(() => undefined);
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
    if (backgroundAudioRef.current) backgroundAudioRef.current.muted = backgroundMuted;
  }, [backgroundMuted, sessionEnded]);

  useEffect(() => {
    const log = conversationRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [conversation]);

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
      const response = await fetch("/api/safety", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId: scenario.id, imageDataUrl: canvas.toDataURL("image/jpeg", 0.68) }),
      });
      const result = (await response.json()) as { alert?: boolean; reason?: string };
      if (response.ok && result.alert) {
        setSafetyReason(result.reason || "You may need a short break.");
        setSafetyOpen(true);
        setMonitorPaused(true);
      }
    } catch {
      // Monitoring stays silent unless a clear concern is detected.
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
    void navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    }).then(async (stream) => {
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
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      activeStream?.getTracks().forEach((track) => track.stop());
      if (streamRef.current === activeStream) streamRef.current = null;
    };
  }, [sessionEnded]);

  useEffect(() => {
    if (!cameraOn || monitorPaused) return;
    const firstCheck = setTimeout(() => void analyzeFrame(), 1800);
    safetyTimerRef.current = setInterval(() => void analyzeFrame(), 10_000);
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

  const finishSession = useCallback((state: ScenarioRuntimeState) => {
    const nextSummary = buildSessionSummary(state);
    if (state.metrics.activityCompleted) markCourseComplete(scenario.id);
    setSummary(nextSummary);
    setRuntimeState(state);
    setSessionEnded(true);
    setSafetyOpen(false);
    backgroundAudioRef.current?.pause();
    stopCamera();
    recognitionRef.current?.stop();
    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        scenarioId: scenario.id,
        startedAt: sessionStartedAtRef.current,
        state,
      }),
    }).catch(() => undefined);
  }, [stopCamera]);

  const openFeedback = () => {
    const minutes = Math.max(1, Math.round((Date.now() - Date.parse(sessionStartedAtRef.current)) / 60_000));
    const params = new URLSearchParams({
      scenario: scenario.id,
      minutes: String(minutes),
      turns: String(summary?.conversationTurns ?? runtimeState.metrics.conversationalTurns),
    });
    router.push(`/feedback/?${params.toString()}`);
  };

  const requestCoach = useCallback(async (transcript: string) => {
    const clean = transcript.trim();
    if (!clean || thinking) return;
    setThinking(true);
    setTypedText("");
    const responseLatencyMs = Date.now() - turnStartedAtRef.current;
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: scenario.id,
          sessionId: sessionIdRef.current,
          transcript: clean,
          responseLatencyMs,
          state: runtimeState,
          context: {
            recentTurns: conversation.slice(-4).map((turn) => `${turn.heard ? `Child: ${turn.heard}. ` : ""}${turn.npcName}: ${turn.peerReply}`),
          },
        }),
      });
      const result = (await response.json()) as CoachResponse & { error?: string };
      if (!response.ok) throw new Error(result.error || "No response received");
      setRuntimeState(result.state);
      setCoach(result);
      setConversation((current) => [...current, {
        heard: clean,
        npcName: result.npcName,
        peerReply: result.peerReply,
      }]);
      setNotice(null);
      turnStartedAtRef.current = Date.now();
      if (result.complete) finishSession(result.state);
    } catch {
      setNotice("The connection paused. Your words are still here—please try once more.");
    } finally {
      setThinking(false);
    }
  }, [conversation, finishSession, runtimeState, thinking]);

  const startListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice("Voice recognition is not available in this browser. You can type instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? "").join("").trim();
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

  const askForHint = () => {
    const nextLevel = clampPromptLevel(runtimeState.promptLevel + 1);
    const nextState = { ...runtimeState, promptLevel: nextLevel };
    setRuntimeState(nextState);
    setCoach((current) => ({
      ...current,
      state: nextState,
      prompt: getPromptSupport(nextState.stage, nextLevel),
      suggestions: getPromptSupport(nextState.stage, nextLevel).suggestions,
    }));
  };

  const useSuggestion = (suggestion: Suggestion) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(suggestion.text);
      utterance.lang = "en-US";
      utterance.rate = 0.86;
      window.speechSynthesis.speak(utterance);
    }
    void requestCoach(suggestion.text);
  };

  const submitText = (event: FormEvent) => {
    event.preventDefault();
    void requestCoach(typedText);
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: "start_playground_practice",
        title: "Start playground practice",
        description: "Start a structured playground communication practice at the recommended difficulty.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input) => {
          if (input === null || typeof input !== "object" || Array.isArray(input) || Object.keys(input as Record<string, unknown>).length > 0) {
            throw new Error("This action does not accept input.");
          }
          resetSession(profile.recommendedDifficulty);
          return { scenario: scenario.id, difficulty: profile.recommendedDifficulty, status: "ready" };
        },
      }, { signal: lifecycle.signal })).catch(() => undefined);
    } catch {
      // WebMCP is optional.
    }
    return () => lifecycle.abort();
  }, [profile.recommendedDifficulty, resetSession]);

  if (sessionEnded) {
    const result = summary ?? buildSessionSummary(runtimeState);
    return (
      <main className="session-end">
        <section className="session-end__card" aria-labelledby="summary-title">
          <div className="session-end__icon"><HeartHandshake aria-hidden="true" /></div>
          <p className="eyebrow">Practice summary</p>
          <h1 id="summary-title">You chose how this interaction ended</h1>
          <p>There is no single right way to socialize. Here is what happened in this practice.</p>
          <dl className="session-summary">
            <div><dt>Difficulty</dt><dd>Level {result.difficulty}</dd></div>
            <div><dt>Conversation turns</dt><dd>{result.conversationTurns}</dd></div>
            <div><dt>Spontaneous initiation</dt><dd>{result.spontaneousInitiation ? "Yes" : "Not this time"}</dd></div>
            <div><dt>Highest prompt used</dt><dd>Level {result.highestPromptLevel}</dd></div>
            <div><dt>Clarification</dt><dd>{result.successfulClarifications > 0 ? `${result.successfulClarifications} successful repair` : "Not practised"}</dd></div>
            <div><dt>Rejection handling</dt><dd>{result.rejectionResponses > 0 ? "Practised" : "Not practised"}</dd></div>
            <div><dt>Suggested next time</dt><dd>Level {result.suggestedNextDifficulty}</dd></div>
          </dl>
          <div className="session-end__actions">
            {result.activityCompleted && (
              <button className="primary-button" onClick={openFeedback}>
                <Check aria-hidden="true" /> Finish scenario
              </button>
            )}
            <button className="secondary-button" onClick={() => resetSession(result.suggestedNextDifficulty)}>
              <RotateCcw aria-hidden="true" /> Practise again
            </button>
          </div>
          <a className="session-end__back" href="/student">Back to scenarios</a>
        </section>
      </main>
    );
  }

  const currentStage = getStageDefinition(runtimeState.stage);
  const visibleStages = stageDefinitions.filter((stage) => stage.id !== "complete");
  const currentStageIndex = visibleStages.findIndex((stage) => stage.id === runtimeState.stage);
  const difficulty = getDifficulty(scenario, runtimeState.difficulty);

  return (
    <main className="scenario-shell">
      <video ref={videoRef} className="background-monitor-video" muted playsInline aria-hidden="true" />

      <header className="topbar">
        <button className="exit-button" onClick={() => finishSession(runtimeState)}>
          <LogOut aria-hidden="true" /> Pause practice
        </button>
        <div className="scenario-heading">
          <strong>{scenario.title}</strong>
          <span>Level {runtimeState.difficulty} · {difficulty.name}</span>
        </div>
        <div className="status-row" aria-label="Audio controls">
          <button
            type="button"
            className="icon-button"
            onClick={() => setBackgroundMuted((value) => !value)}
            aria-label={backgroundMuted ? "Turn on playground sounds" : "Mute playground sounds"}
            aria-pressed={backgroundMuted}
          >
            {backgroundMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          </button>
          <span className={listening ? "status-pill status-pill--active" : "status-pill"}>
            {listening ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}
            {listening ? "Listening" : "Mic ready"}
          </span>
        </div>
      </header>

      <section className="stage-strip" aria-label="Practice steps">
        <ol>
          {visibleStages.map((stage, index) => (
            <li
              key={stage.id}
              className={index < currentStageIndex ? "stage-done" : index === currentStageIndex ? "stage-current" : ""}
              aria-current={index === currentStageIndex ? "step" : undefined}
            >
              <span>{index < currentStageIndex ? <Check aria-hidden="true" /> : index + 1}</span>
              <small>{stage.label}</small>
            </li>
          ))}
        </ol>
        <p><strong>{currentStage.label}:</strong> {currentStage.objective}</p>
      </section>

      <section className="scene-content" aria-label={scenario.sceneAriaLabel}>
        <img className="scenario-bg" src={scenario.image.src} alt={scenario.image.alt} />
        <div className="peer-bubble" role="status" aria-live="polite">
          <span>{coach.npcName} says</span>
          <p>“{coach.peerReply}”</p>
        </div>
      </section>

      <section className="coach-dock" aria-label="Communication coach">
        <div className="coach-head">
          <div>
            <h2 className="coach-label"><Sprout aria-hidden="true" /> Your communication coach</h2>
            <p>{coach.coachNote}</p>
          </div>
          <div className="prompt-meter" aria-label={`Prompt level ${runtimeState.promptLevel} of 4`}>
            {[1, 2, 3, 4].map((level) => <span key={level} className={level <= runtimeState.promptLevel ? "is-on" : ""} />)}
          </div>
        </div>

        <div className="conversation-log" role="log" aria-label="Conversation history" aria-busy={thinking} ref={conversationRef}>
          {conversation.map((turn, index) => (
            <div className="conversation-turn" key={`${turn.npcName}-${index}`}>
              {turn.heard && <p><strong>You:</strong> {turn.heard}</p>}
              <p><strong>{turn.npcName}:</strong> {turn.peerReply}</p>
            </div>
          ))}
          {thinking && <p className="coach-note" role="status">Thinking about what you meant…</p>}
        </div>

        <div className={coach.prompt.text ? "prompt-panel" : "prompt-panel prompt-panel--quiet"}>
          <div>
            <span>{coach.prompt.label}</span>
            <p>{coach.prompt.text || "Try it your way. Ask for a hint only if you want one."}</p>
          </div>
          <button type="button" onClick={askForHint} disabled={runtimeState.promptLevel >= 4 || thinking}>
            <HelpCircle aria-hidden="true" /> {runtimeState.promptLevel >= 4 ? "All hints shown" : "Need a hint?"}
          </button>
        </div>

        {coach.prompt.suggestions.length > 0 && (
          <div className="suggestion-grid" aria-label="Example responses">
            {coach.prompt.suggestions.map((suggestion) => (
              <button type="button" key={`${suggestion.intent}-${suggestion.text}`} onClick={() => useSuggestion(suggestion)} disabled={thinking}>
                <span>{suggestion.intent}</span>
                <strong>“{suggestion.text}”</strong>
                <small>Tap to try it</small>
              </button>
            ))}
          </div>
        )}

        <div className="voice-row">
          <button className={listening ? "mic-button mic-button--active" : "mic-button"} onClick={startListening} aria-pressed={listening} disabled={thinking}>
            {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
            <span>{listening ? "Tap to stop" : "Say what you think"}</span>
          </button>
          <form onSubmit={submitText}>
            <label htmlFor="practice-input" className="sr-only">Type what you want to say</label>
            <input
              id="practice-input"
              value={typedText}
              onChange={(event) => setTypedText(event.target.value)}
              placeholder="Or type your own words…"
              maxLength={180}
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
            <AlertDialogAction onClick={() => finishSession(runtimeState)}>Stop and rest</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
