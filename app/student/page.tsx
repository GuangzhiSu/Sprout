import type { Metadata } from "next";
import { Clock, Lock, Play, Sprout, Star } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { courseHref, levels, type Course } from "@/lib/courses";
import { playgroundScenario } from "@/lib/scenarios";
import { recordings } from "@/lib/tracking";

export const metadata: Metadata = {
  title: "Scenarios · Sprout",
  description: "Pick a scenario and practise talking, one level at a time.",
};

export default function StudentPage() {
  return (
    <main className="dash dash--student">
      <AppNav variant="student" current="Scenarios" />

      <div className="dash-shell">
        <section className="sv__hero">
          <span className="sv__sprout" aria-hidden="true"><Sprout size={36} color="#2F7386" /></span>
          <div>
            <h1 className="sv__hello display">Hi! Ready to practise?</h1>
            <p className="sv__line">Pick a card. You can stop whenever you want.</p>
          </div>
        </section>

        {levels.map((level) => (
          <section className="level" key={level.id} aria-labelledby={`${level.id}-name`}>
            <div className="level__head">
              <span className="level__badge">{level.label}</span>
              <h2 className="level__name" id={`${level.id}-name`}>{level.name}</h2>
              <p className="level__goal">{level.goal}</p>
            </div>

            <div className="level__grid">
              {level.courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </section>
        ))}

        <section className="level" id="stars" aria-labelledby="stars-name">
          <div className="level__head">
            <span className="level__badge">Stars</span>
            <h2 className="level__name" id="stars-name">You practised {recordings.length} times</h2>
            <p className="level__stars" aria-hidden="true">
              {recordings.map((recording) => (
                <Star key={recording.id} size={18} fill="#FFE2A8" color="#E8B94A" />
              ))}
            </p>
          </div>
        </section>

        <section id="help">
          <p className="dash-foot">
            Need help? Ask the grown-up next to you — they can open the tracking panel from the
            same screen. Sprout is a research prototype. It is not a medical device and does not
            replace professional diagnosis or intervention.
          </p>
        </section>
      </div>
    </main>
  );
}

function CourseCard({ course }: { course: Course }) {
  const href = courseHref(course);
  const usesScenePhoto = course.scenarioId === playgroundScenario.id;

  const inner = (
    <>
      <div className={`course-card__tile course-card__tile--${course.tile}`}>
        {usesScenePhoto ? (
          <img src={playgroundScenario.image.src} alt="" />
        ) : (
          <span aria-hidden="true">{course.emoji}</span>
        )}
        <span className={href ? "course-card__flag" : "course-card__flag course-card__flag--soon"}>
          {href ? <Play aria-hidden="true" /> : <Lock aria-hidden="true" />}
          {href ? "Ready" : "Coming soon"}
        </span>
      </div>
      <div className="course-card__body">
        <h3 className="course-card__name">{course.name}</h3>
        <p className="course-card__blurb">{course.blurb}</p>
        <p className="course-card__meta">
          <Clock aria-hidden="true" /> About {course.minutes} minutes
        </p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="course-card course-card--soon" aria-label={`${course.name}. Coming soon.`}>
        {inner}
      </div>
    );
  }

  return <a className="course-card" href={href}>{inner}</a>;
}
