import type { Metadata } from "next";
import { ChartLine, Play } from "lucide-react";

export const metadata: Metadata = {
  title: "Who is here? · Sprout",
  description: "Choose the child's practice view or the parent tracking panel.",
};

/**
 * The step between the landing page and the two dashboards: one question,
 * two answers. Kept in the landing page's world, because the child is the one
 * most likely to be holding the device.
 */
export default function ChoosePage() {
  return (
    <main className="dash dash--student pick">
      <div className="pick__inner">
        <h1 className="pick__title display">Who is using Sprout today?</h1>
        <p className="pick__sub">Tap your picture. You can change this at any time.</p>

        <div className="pick__grid">
          <a className="pick-card pick-card--student" href="/student">
            <span className="pick-card__icon" aria-hidden="true"><Play /></span>
            <span className="pick-card__title display">I&rsquo;m a child</span>
            <span className="pick-card__sub">Pick a scenario and practise talking</span>
          </a>

          <a className="pick-card pick-card--parent" href="/parent">
            <span className="pick-card__icon" aria-hidden="true"><ChartLine /></span>
            <span className="pick-card__title display">I&rsquo;m a parent</span>
            <span className="pick-card__sub">See scores, trends and conversations</span>
          </a>
        </div>

        <a className="pick__back" href="/landing/">← Go back home</a>
      </div>
    </main>
  );
}
