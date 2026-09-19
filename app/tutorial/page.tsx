"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mic, MicOff, Sparkles, Volume2 } from "lucide-react";
import { SproutMascot } from "@/components/sprout-mascot";
import {
  profileSnapshot,
  saveProfile,
  serverProfileSnapshot,
  subscribeProfile,
  type Profile,
} from "@/lib/profile";
import { playgroundScenario } from "@/lib/scenarios";

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
}

const AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const LIKES = [
  { id: "dinosaurs", label: "Dinosaurs", emoji: "🦖" },
  { id: "drawing", label: "Drawing", emoji: "🖍️" },
  { id: "animals", label: "Animals", emoji: "🐶" },
  { id: "space", label: "Space", emoji: "🚀" },
  { id: "trains", label: "Trains", emoji: "🚂" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "blocks", label: "Building", emoji: "🧱" },
];

const SAMPLE_LINES = [
  { intent: "Join in", text: "Can I play with you?" },
  { intent: "Ask first", text: "What are you building?" },
  { intent: "Share interest", text: "I like blocks too." },
];

const STEPS = ["hello", "name", "age", "likes", "cards", "voice", "break", "done"] as const;
type Step = (typeof STEPS)[number];

export default function TutorialPage() {
  const stored = useSyncExternalStore(subscribeProfile, profileSnapshot, serverProfileSnapshot);
  const router = useRouter();

  /* A child who has already done the tour goes straight to their courses,
     unless they asked for it again from the dashboard. */
  const [again] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("again"),
  );
  const leaving = stored.tutorialDone && !again;
  useEffect(() => {
    if (leaving) router.replace("/student");
  }, [leaving, router]);

  const [step, setStep] = useState<Step>("hello");
  const [draft, setDraft] = useState<Pick<Profile, "name" | "age" | "likes">>(() => {
    const saved = profileSnapshot();
    return { name: saved.name, age: saved.age, likes: saved.likes };
  });

  /* Saying no is a real answer. When a child declines a question, Sprout says
     so out loud before moving on, rather than silently skipping ahead. */
  const [declined, setDeclined] = useState<null | "name" | "age" | "likes">(null);

  const index = STEPS.indexOf(step);
  const go = (to: Step) => setStep(to);
  const next = () => go(STEPS[Math.min(index + 1, STEPS.length - 1)]);
  /* Declining has to clear the field as well as acknowledge the answer: a
     child who types two letters and then says no has not told us their name,
     and neither has one replaying the tour who now declines. */
  const decline = (question: "name" | "age" | "likes") => {
    setDraft((current) => ({
      ...current,
      ...(question === "name" ? { name: "" } : {}),
      ...(question === "age" ? { age: null } : {}),
      ...(question === "likes" ? { likes: [] } : {}),
    }));
    setDeclined(question);
  };
  const carryOn = () => {
    setDeclined(null);
    next();
  };

  const finish = () => {
    const saved = saveProfile({ ...draft, tutorialDone: true });
    const params = new URLSearchParams({ tutorial: "1" });
    if (saved.name) params.set("name", saved.name);
    // The celebration is a static page under public/, not an app route, so it
    // needs a real navigation rather than the client router.
    window.location.href = `/feedback/?${params.toString()}`;
  };

  if (leaving) {
    return (
      <main className="tut">
        <div className="tut__wash" aria-hidden="true" />
        <div className="tut__stage">
          <p className="tut__loading">Taking you to your courses…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="tut">
      <img className="tut__scene" src={playgroundScenario.image.src} alt="" />
      <div className="tut__wash" aria-hidden="true" />

      <header className="tut__top">
        <span className="tut__brand">
          <Sparkles aria-hidden="true" /> Sprout
        </span>
        {/* One dot per step: filled for the ones behind, ringed for the one
            being shown. The row is never entirely filled while the tour is
            still running. */}
        <ol className="tut__dots" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((id, position) => (
            <li
              key={id}
              className={position < index ? "is-done" : position === index ? "is-now" : undefined}
              aria-hidden="true"
            />
          ))}
        </ol>
        <button
          type="button"
          className="tut__skip"
          onClick={() => {
            saveProfile({ ...draft, tutorialDone: true });
            router.replace("/student");
          }}
        >
          Skip the tour
        </button>
      </header>

      <div className="tut__stage">
        <section className="tut__card" aria-live="polite">
          {declined && <Declined question={declined} onNext={carryOn} />}
          {!declined && step === "hello" && <Hello onNext={next} />}
          {!declined && step === "name" && (
            <NameStep
              value={draft.name}
              onChange={(name) => setDraft((current) => ({ ...current, name }))}
              onNext={next}
              onDecline={() => decline("name")}
            />
          )}
          {!declined && step === "age" && (
            <AgeStep
              value={draft.age}
              onPick={(age) => {
                setDraft((current) => ({ ...current, age }));
                next();
              }}
              onDecline={() => decline("age")}
            />
          )}
          {!declined && step === "likes" && (
            <LikesStep
              value={draft.likes}
              onToggle={(id) =>
                setDraft((current) => ({
                  ...current,
                  likes: current.likes.includes(id)
                    ? current.likes.filter((like) => like !== id)
                    : [...current.likes, id],
                }))
              }
              onNext={next}
              onDecline={() => decline("likes")}
            />
          )}
          {!declined && step === "cards" && <CardsStep name={draft.name} onNext={next} />}
          {!declined && step === "voice" && <VoiceStep onNext={next} />}
          {!declined && step === "break" && <BreakStep onNext={next} />}
          {!declined && step === "done" && <DoneStep name={draft.name} onFinish={finish} />}
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="tut__say">
      <span className="tut__mascot" aria-hidden="true"><SproutMascot size={88} /></span>
      <p>{children}</p>
    </div>
  );
}

function Hello({ onNext }: { onNext: () => void }) {
  return (
    <>
      <Bubble>Hi! I&rsquo;m Sprout.</Bubble>
      <h1 className="tut__title display">Let&rsquo;s practice talking together</h1>
      <p className="tut__line">
        First I would like to know you a little. Then I will show you how this works.
        It is short, and you can stop whenever you want.
      </p>
      <button type="button" className="tut__go" onClick={onNext}>
        Okay! <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}

function NameStep({
  value,
  onChange,
  onNext,
  onDecline,
}: {
  value: string;
  onChange: (name: string) => void;
  onNext: () => void;
  onDecline: () => void;
}) {
  return (
    <>
      <Bubble>What should I call you?</Bubble>
      <form
        className="tut__form"
        onSubmit={(event) => {
          event.preventDefault();
          onNext();
        }}
      >
        <label className="sr-only" htmlFor="tutorial-name">Your name</label>
        <input
          id="tutorial-name"
          className="tut__input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type your name"
          maxLength={24}
          autoComplete="off"
        />
        <button type="submit" className="tut__go" disabled={!value.trim()}>
          That&rsquo;s me <ArrowRight aria-hidden="true" />
        </button>
      </form>
      <button type="button" className="tut__quiet" onClick={onDecline}>I&rsquo;d rather not say</button>
      <p className="tut__note">Only this device remembers your name. A grown-up can clear it at any time.</p>
    </>
  );
}

function AgeStep({
  value,
  onPick,
  onDecline,
}: {
  value: number | null;
  onPick: (age: number) => void;
  onDecline: () => void;
}) {
  return (
    <>
      <Bubble>How old are you?</Bubble>
      <div className="tut__ages">
        {AGES.map((age) => (
          <button
            key={age}
            type="button"
            className={value === age ? "tut__age tut__age--on" : "tut__age"}
            onClick={() => onPick(age)}
          >
            {age}
          </button>
        ))}
      </div>
      <button type="button" className="tut__quiet" onClick={onDecline}>I&rsquo;d rather not say</button>
    </>
  );
}

function LikesStep({
  value,
  onToggle,
  onNext,
  onDecline,
}: {
  value: string[];
  onToggle: (id: string) => void;
  onNext: () => void;
  onDecline: () => void;
}) {
  return (
    <>
      <Bubble>What do you like?</Bubble>
      <p className="tut__line">Tap as many as you want. I will talk about them sometimes.</p>
      <div className="tut__chips">
        {LIKES.map((like) => {
          const on = value.includes(like.id);
          return (
            <button
              key={like.id}
              type="button"
              className={on ? "tut__chip tut__chip--on" : "tut__chip"}
              onClick={() => onToggle(like.id)}
              aria-pressed={on}
            >
              <span aria-hidden="true">{like.emoji}</span> {like.label}
              {on && <Check aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      <button type="button" className="tut__go" onClick={onNext}>
        Done <ArrowRight aria-hidden="true" />
      </button>
      <button type="button" className="tut__quiet" onClick={onDecline}>I&rsquo;d rather not say</button>
    </>
  );
}

/** What Sprout says when a child would rather not answer. */
function Declined({ question, onNext }: { question: "name" | "age" | "likes"; onNext: () => void }) {
  const lines = {
    name: "You do not have to tell me your name.",
    age: "You do not have to tell me your age.",
    likes: "You can tell me another day.",
  };
  return (
    <>
      <Bubble>That&rsquo;s fine.</Bubble>
      <h2 className="tut__title display">Let&rsquo;s keep going</h2>
      <p className="tut__line">{lines[question]} Nothing changes — we can practice just the same.</p>
      <button type="button" className="tut__go" onClick={onNext}>
        Okay <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}

function CardsStep({ name, onNext }: { name: string; onNext: () => void }) {
  const [heard, setHeard] = useState<string | null>(null);

  const speak = (text: string) => {
    setHeard(text);
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.lang = "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      <Bubble>{name ? `Nice to meet you, ${name}!` : "Nice to meet you!"}</Bubble>
      <h2 className="tut__title display">I give you words to try</h2>
      <p className="tut__line">
        In a practice, I show three things you could say. Tap one to hear how it sounds.
      </p>
      <div className="tut__cards">
        {SAMPLE_LINES.map((line) => (
          <button
            key={line.text}
            type="button"
            className={heard === line.text ? "tut__reply tut__reply--on" : "tut__reply"}
            onClick={() => speak(line.text)}
          >
            <span>{line.intent}</span>
            <strong>&ldquo;{line.text}&rdquo;</strong>
            <small><Volume2 aria-hidden="true" /> Tap to hear it</small>
          </button>
        ))}
      </div>
      {heard && <p className="tut__good"><Check aria-hidden="true" /> That is how it sounds. You can always pick a card.</p>}
      <button type="button" className="tut__go" onClick={onNext}>
        {heard ? "Next" : "Skip this one"} <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}

function VoiceStep({ onNext }: { onNext: () => void }) {
  const [listening, setListening] = useState(false);
  const [said, setSaid] = useState("");
  const [typed, setTyped] = useState("");
  const [trouble, setTrouble] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const supported = useMemo(
    () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const listen = () => {
    if (listening) return stop();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setTrouble("This browser cannot hear yet. You can type instead.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const words = Array.from({ length: event.results.length }, (_, i) => event.results[i][0].transcript).join(" ");
      setSaid(words.trim());
      setTrouble(null);
    };
    recognition.onerror = () => {
      setTrouble("I could not hear that. You can try again, or type instead.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const done = Boolean(said || typed.trim());

  return (
    <>
      <Bubble>You can talk to me out loud.</Bubble>
      <h2 className="tut__title display">Try your voice</h2>
      <p className="tut__line">
        Press the button, then say <strong>&ldquo;hello&rdquo;</strong>. Your voice stays on this device.
      </p>

      <button
        type="button"
        className={listening ? "tut__mic tut__mic--on" : "tut__mic"}
        onClick={listen}
        aria-pressed={listening}
        disabled={!supported && Boolean(trouble)}
      >
        {listening ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
        {listening ? "I'm listening — tap to stop" : "Press and say hello"}
      </button>

      {said && <p className="tut__good"><Check aria-hidden="true" /> I heard: &ldquo;{said}&rdquo;</p>}
      {trouble && <p className="tut__note">{trouble}</p>}
      {!supported && <p className="tut__note">This browser cannot hear yet. Typing works just as well.</p>}

      <form className="tut__form" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="tutorial-typed">Type instead</label>
        <input
          id="tutorial-typed"
          className="tut__input"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder="Or type hello…"
          maxLength={40}
        />
      </form>

      <button type="button" className="tut__go" onClick={() => { stop(); onNext(); }}>
        {done ? "Next" : "Skip this one"} <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}

function BreakStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <Bubble>You can stop whenever you want.</Bubble>
      <h2 className="tut__title display">Taking a break is allowed</h2>
      <ul className="tut__list">
        <li><Check aria-hidden="true" /> Say &ldquo;I need a break&rdquo; and we stop.</li>
        <li><Check aria-hidden="true" /> The Exit button is always in the corner.</li>
        <li><Check aria-hidden="true" /> A grown-up can sit with you the whole time.</li>
      </ul>
      <button type="button" className="tut__go" onClick={onNext}>
        I understand <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}

function DoneStep({ name, onFinish }: { name: string; onFinish: () => void }) {
  return (
    <>
      <Bubble>{name ? `You're ready, ${name}!` : "You're ready!"}</Bubble>
      <h2 className="tut__title display">That was the whole tour</h2>
      <p className="tut__line">Now you can pick your first card and practice for real.</p>
      <button type="button" className="tut__go tut__go--big" onClick={onFinish}>
        Finish the tour <ArrowRight aria-hidden="true" />
      </button>
    </>
  );
}
