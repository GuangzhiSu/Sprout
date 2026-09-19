import type { Metadata } from "next";
import { ArrowDown, CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { StatusChip } from "@/components/status-chip";
import { ConversationLog } from "@/components/conversation-log";
import { SubscaleDetails, TotalScorePanel } from "@/components/tracking";
import { buildOverview, longDate, totalScore } from "@/lib/tracking";

export const metadata: Metadata = {
  title: "Tracking panel · Sprout",
  description: "SRS-2 score tracking, subscale detail and recent session recordings.",
};

export default function ParentPage() {
  const overview = buildOverview();
  const { latest, previous, result } = overview;
  const sinceBaseline = Math.round((result.target - latest.value) * 10) / 10;
  const sincePrevious = Math.round((previous.value - latest.value) * 10) / 10;

  return (
    <main className="dash dash--parent">
      <AppNav variant="parent" current="Overview" />

      <div className="dash-shell">
        <header className="pv__head">
          <div>
            <h1 className="pv__title display">How things are going</h1>
            <p className="pv__sub">Ming · 8 years old · {totalScore.length} questionnaires since April</p>
          </div>
          <p className="pv__updated">Last updated {longDate(latest.date)}</p>
        </header>

        {/* ---------- status overview ---------- */}
        <section className="panel" aria-labelledby="status-heading">
          <div className="panel__head">
            <h2 className="panel__label" id="status-heading">Status Overview</h2>
            <p className="panel__note">From the SRS-2 scores and a CUSUM check against your child&rsquo;s own baseline</p>
          </div>

          <div className="card status-card">
            <div className="status-card__main">
              <div className="status-card__flag">
                <StatusChip status={overview.status} size="lg" />
                <span className="pv__updated">as of {longDate(latest.date)}</span>
              </div>

              <div className="status-card__stats">
                <div className="stat">
                  <p className="stat__label">Latest total</p>
                  <p className="stat__value">
                    {latest.value}
                    <small>T-score</small>
                    {sincePrevious > 0 && (
                      <span className="stat__delta stat__delta--good">
                        <ArrowDown aria-hidden="true" />{sincePrevious} vs last round
                      </span>
                    )}
                  </p>
                  <p className="stat__note">Lower means less reported difficulty</p>
                </div>

                <div className="stat">
                  <p className="stat__label">Since baseline</p>
                  <p className="stat__value">
                    {sinceBaseline > 0 ? "−" : "+"}{Math.abs(sinceBaseline)}
                    <small>points</small>
                  </p>
                  <p className="stat__note">Baseline {result.target}, set by the first four rounds</p>
                </div>

                <div className="stat">
                  <p className="stat__label">Areas flagged</p>
                  <p className="stat__value">{overview.flagged.length}<small>of {overview.bySubscale.length}</small></p>
                  <p className="stat__note">
                    {overview.flagged.length > 0
                      ? overview.flagged.map((entry) => entry.subscale.name).join(", ")
                      : "Nothing drifting up right now"}
                  </p>
                </div>
              </div>
            </div>

            <aside className="status-card__legend">
              <h3>What the colour means</h3>
              <ul className="legend-list">
                <li>
                  <CircleCheck className="is-good" aria-hidden="true" />
                  <span><strong>Green · steady or improving.</strong> Nothing here needs a change of plan.</span>
                </li>
                <li>
                  <TriangleAlert className="is-warning" aria-hidden="true" />
                  <span><strong>Amber · worth watching.</strong> Scores are drifting up. Look again in two weeks.</span>
                </li>
                <li>
                  <CircleAlert className="is-critical" aria-hidden="true" />
                  <span><strong>Red · needs attention.</strong> A sustained change. Worth raising at the next appointment.</span>
                </li>
              </ul>
            </aside>
          </div>
        </section>

        {/* ---------- score tracking ---------- */}
        <section className="panel" aria-labelledby="tracking-heading">
          <div className="panel__head">
            <h2 className="panel__label" id="tracking-heading">SRS-2 Score Tracking</h2>
            <p className="panel__note">Total score first; open Details for the five subscales</p>
          </div>

          <TotalScorePanel />
          <SubscaleDetails />
        </section>

        {/* ---------- conversations ---------- */}
        <section className="panel" id="conversations" aria-labelledby="conversations-heading">
          <div className="panel__head">
            <h2 className="panel__label" id="conversations-heading">Recent Conversations</h2>
            <p className="panel__note">What was said, turn by turn — pick a session to read it</p>
          </div>

          <ConversationLog />
        </section>

        <p className="dash-foot" id="about">
          SRS-2 scores come from the caregiver questionnaire; the status light is a CUSUM check on
          those scores, not a diagnosis. Sprout is a research prototype. It is not a medical device
          and does not replace professional diagnosis or intervention.
        </p>
      </div>
    </main>
  );
}
