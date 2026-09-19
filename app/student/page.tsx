"use client";

import { useSyncExternalStore } from "react";
import { Check, Clock, Lock, Play, Star } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { SproutMascot } from "@/components/sprout-mascot";
import {
  courseHref,
  courseStates,
  levelStates,
  levels,
  type Course,
  type CourseState,
} from "@/lib/courses";
import { profileSnapshot, serverProfileSnapshot, subscribeProfile } from "@/lib/profile";
import { progressSnapshot, serverProgressSnapshot, subscribeProgress } from "@/lib/progress";
import { playgroundScenario } from "@/lib/scenarios";

/**
 * Scenario cards, in the landing page's world: one level open at a time, one
 * card lit up inside it, and everything further along quietly locked so there
 * is never more than one obvious thing to do.
 */
export default function StudentPage() {
  /* Progress lives in the browser, so the first paint shows a fresh start and
     the real state arrives as soon as the store can be read. */
  const completed = useSyncExternalStore(subscribeProgress, progressSnapshot, serverProgressSnapshot);
  const profile = useSyncExternalStore(subscribeProfile, profileSnapshot, serverProfileSnapshot);

  const states = courseStates(completed);
  const openLevels = levelStates(completed);
  /* The card the child should look at: the next one that is open, whether it
     is playable yet or not. */
  const next = levels
    .flatMap((level) => level.courses)
    .find((course) => states[course.id] === "current" || states[course.id] === "soon");

  return (
    <main className="dash dash--student sv">
      <AppNav variant="student" current="Scenarios" />

      <div className="dash-shell">
        <section className="sv__hero">
          <span className="sv__mascot" aria-hidden="true"><SproutMascot size={152} /></span>
          <div className="sv__greeting">
            <p className="sv__bubble">
              {!next
                ? "You finished every card. Well done!"
                : states[next.id] === "current"
                  ? `Next up: ${next.name}.`
                  : "The next card is still being made."}
            </p>
            <h1 className="sv__hello display">
              {profile.name ? `Ready to practice, ${profile.name}?` : "Ready to practice?"}
            </h1>
            <p className="sv__line">Pick the card that is lit up. You can stop whenever you want.</p>
          </div>
        </section>

        {levels.map((level) => {
          const locked = openLevels[level.id] === "locked";
          return (
            <section className={locked ? "level level--locked" : "level"} key={level.id} aria-labelledby={`${level.id}-name`}>
              <div className="level__head">
                <span className="level__badge">
                  {locked && <Lock aria-hidden="true" />}
                  {level.label}
                </span>
                <h2 className="level__name" id={`${level.id}-name`}>{level.name}</h2>
                <p className="level__goal">
                  {locked ? "Finish the level before this one to open it." : level.goal}
                </p>
              </div>

              <div className="level__grid">
                {level.courses.map((course) => (
                  <CourseCard key={course.id} course={course} state={states[course.id]} />
                ))}
              </div>
            </section>
          );
        })}

        <section className="level" id="stars" aria-labelledby="stars-name">
          <div className="level__head">
            <span className="level__badge">Stars</span>
            <h2 className="level__name" id="stars-name">
              {completed.length === 0
                ? "No stars yet — the first one is waiting"
                : `You finished ${completed.length} ${completed.length === 1 ? "course" : "courses"}`}
            </h2>
            <p className="level__stars" aria-hidden="true">
              {completed.map((id) => (
                <Star key={id} size={20} fill="#FFE2A8" color="#E8B94A" />
              ))}
            </p>
          </div>
        </section>

        <section id="help">
          <p className="dash-foot">
            <a className="dash-foot__link" href="/tutorial?again=1">Watch the tour again</a>.
          </p>
        </section>
      </div>
    </main>
  );
}

const flags: Record<CourseState, { label: string; icon: typeof Play }> = {
  current: { label: "Start here", icon: Play },
  done: { label: "Done", icon: Check },
  soon: { label: "Coming soon", icon: Clock },
  locked: { label: "Locked", icon: Lock },
};

function CourseCard({ course, state }: { course: Course; state: CourseState }) {
  const href = state === "current" || state === "done" ? courseHref(course) : null;
  const flag = flags[state];
  const Icon = flag.icon;
  const usesScenePhoto = course.scenarioId === playgroundScenario.id;

  const inner = (
    <>
      <span className={`course-card__flag course-card__flag--${state}`}>
        <Icon aria-hidden="true" />
        {flag.label}
      </span>

      <span className={`course-card__window course-card__window--${course.tile}`}>
        {usesScenePhoto && state !== "locked" ? (
          <img src={playgroundScenario.image.src} alt="" />
        ) : (
          <span className="course-card__emoji" aria-hidden="true">
            {state === "locked" ? <Lock size={34} /> : course.emoji}
          </span>
        )}
      </span>

      <span className="course-card__body">
        <span className="course-card__name display">{course.name}</span>
        <span className="course-card__blurb">{course.blurb}</span>
        <span className="course-card__meta">
          <Clock aria-hidden="true" /> About {course.minutes} minutes
        </span>
      </span>
    </>
  );

  if (!href) {
    return (
      <div
        className={`course-card course-card--${state}`}
        aria-label={`${course.name}. ${flag.label}.`}
      >
        {inner}
      </div>
    );
  }

  return <a className={`course-card course-card--${state}`} href={href}>{inner}</a>;
}
