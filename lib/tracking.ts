/**
 * Tracking data for the parent view.
 *
 * Scores are SRS-2 T-scores: the total score plus the five subscales the
 * report prints. Higher means more difficulty, so a line that goes *down* is
 * progress. The sample data below is illustrative — a real deployment reads
 * the same shapes out of the caregiver questionnaire.
 */

export type Tone = "good" | "warning" | "critical";

export type ScorePoint = {
  /** ISO date of the questionnaire. */
  date: string;
  /** SRS-2 T-score. */
  value: number;
};

export type Subscale = {
  id: string;
  name: string;
  /** What the subscale asks about, in a sentence a parent can use. */
  about: string;
  series: ScorePoint[];
};

/** SRS-2 T-score interpretation bands (higher = more difficulty). */
export const severityBands = [
  { from: 0, to: 59, label: "Within average range" },
  { from: 60, to: 65, label: "Mild" },
  { from: 66, to: 75, label: "Moderate" },
  { from: 76, to: 120, label: "Severe" },
] as const;

export function bandFor(value: number) {
  return severityBands.find((band) => value >= band.from && value <= band.to) ?? severityBands[0];
}

const dates = [
  "2026-04-11", "2026-04-25", "2026-05-09", "2026-05-23",
  "2026-06-06", "2026-06-20", "2026-07-04", "2026-07-18",
  "2026-08-01", "2026-08-15", "2026-08-29", "2026-09-12",
];

function series(values: number[]): ScorePoint[] {
  return values.map((value, index) => ({ date: dates[index], value }));
}

export const totalScore: ScorePoint[] = series([78, 77, 79, 76, 75, 73, 74, 71, 69, 70, 67, 66]);

export const subscales: Subscale[] = [
  {
    id: "social-awareness",
    name: "Social Awareness",
    about: "Noticing social cues — that someone is talking, waiting, or upset.",
    series: series([76, 75, 76, 74, 73, 72, 71, 70, 69, 68, 67, 66]),
  },
  {
    id: "social-cognition",
    name: "Social Cognition",
    about: "Making sense of the cues once they are noticed.",
    series: series([74, 75, 73, 74, 72, 71, 72, 70, 69, 69, 68, 67]),
  },
  {
    id: "social-communication",
    name: "Social Communication",
    about: "Using speech, gesture and expression to take part in an exchange.",
    series: series([80, 79, 81, 78, 77, 75, 76, 73, 71, 72, 69, 68]),
  },
  {
    id: "social-motivation",
    name: "Social Motivation",
    about: "Wanting to join in, and staying with it once started.",
    series: series([72, 71, 73, 70, 71, 69, 70, 68, 67, 68, 66, 65]),
  },
  {
    id: "restricted-repetitive",
    name: "Restricted Interests and Repetitive Behavior",
    about: "Narrow interests and repeated movements or routines.",
    series: series([65, 64, 66, 65, 66, 66, 67, 66, 67, 67, 68, 67]),
  },
];

/* --------------------------------------------------------------------------
   CUSUM
   -------------------------------------------------------------------------- */

export type CusumPoint = ScorePoint & { high: number; low: number };

export type CusumResult = {
  /** Mean of the baseline window — what later scores are compared against. */
  target: number;
  /** Standard deviation used for the slack and the decision interval. */
  sigma: number;
  /** Slack (k) — drift smaller than this is treated as noise. */
  slack: number;
  /** Decision interval (h) — crossing it is a signal. */
  limit: number;
  points: CusumPoint[];
  /** Final upward sum: sustained scores *above* baseline (more difficulty). */
  high: number;
  /** Final downward sum: sustained scores *below* baseline (progress). */
  low: number;
};

/**
 * Tabular CUSUM over a score series.
 *
 * The first `baselineCount` points set the target and the spread; every point
 * is then accumulated. `k = 0.5σ` and `h = 4σ` are the textbook settings, and
 * σ has a floor so a flat baseline cannot make every wobble a signal.
 */
export function cusum(
  points: ScorePoint[],
  { baselineCount = 4, sigmaFloor = 2 }: { baselineCount?: number; sigmaFloor?: number } = {},
): CusumResult {
  const baseline = points.slice(0, Math.max(2, Math.min(baselineCount, points.length)));
  const target = baseline.reduce((sum, point) => sum + point.value, 0) / baseline.length;
  const variance =
    baseline.reduce((sum, point) => sum + (point.value - target) ** 2, 0) / (baseline.length - 1);
  const sigma = Math.max(Math.sqrt(variance), sigmaFloor);
  const slack = 0.5 * sigma;
  const limit = 4 * sigma;

  let high = 0;
  let low = 0;
  const walked = points.map((point) => {
    high = Math.max(0, high + (point.value - target) - slack);
    low = Math.max(0, low + (target - point.value) - slack);
    return { ...point, high: round(high), low: round(low) };
  });

  return { target: round(target), sigma: round(sigma), slack: round(slack), limit: round(limit), points: walked, high: round(high), low: round(low) };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export type Status = {
  tone: Tone;
  /** Two or three words, shown next to the status icon. */
  label: string;
};

/**
 * Turn a CUSUM result into one of the three states.
 *
 * Only the upward sum can raise an alert — scores drifting up means the
 * questionnaire is reporting more difficulty than at baseline.
 */
export function statusFor(result: CusumResult): Status {
  if (result.high >= result.limit) return { tone: "critical", label: "Needs attention" };
  if (result.high >= result.limit / 2) return { tone: "warning", label: "Worth watching" };
  if (result.low >= result.limit) return { tone: "good", label: "Improving" };
  return { tone: "good", label: "Steady" };
}

const toneRank: Record<Tone, number> = { good: 0, warning: 1, critical: 2 };

export type Overview = {
  status: Status;
  /** Status of the total score on its own. */
  total: Status;
  /** Per-subscale statuses, in the order the subscales are listed. */
  bySubscale: { subscale: Subscale; result: CusumResult; status: Status }[];
  /** Subscales that are not green, worst first. */
  flagged: { subscale: Subscale; status: Status }[];
  latest: ScorePoint;
  previous: ScorePoint;
  result: CusumResult;
};

/**
 * The whole status overview: the total score's CUSUM, every subscale's CUSUM,
 * and one headline state — the most severe of them, so a single area drifting
 * up is never hidden behind a good total.
 */
export function buildOverview(): Overview {
  const result = cusum(totalScore);
  const total = statusFor(result);

  const bySubscale = subscales.map((subscale) => {
    const subResult = cusum(subscale.series);
    return { subscale, result: subResult, status: statusFor(subResult) };
  });

  const flagged = bySubscale
    .filter((entry) => entry.status.tone !== "good")
    .sort((a, b) => toneRank[b.status.tone] - toneRank[a.status.tone])
    .map(({ subscale, status }) => ({ subscale, status }));

  /* The headline is the most severe state on the page, so a subscale drifting
     up is never hidden behind a good total. Which subscale it is comes from the
     flagged list beside it. */
  const worst = flagged[0];
  const status: Status = worst && toneRank[worst.status.tone] > toneRank[total.tone] ? worst.status : total;

  return {
    status,
    total,
    bySubscale,
    flagged,
    latest: totalScore[totalScore.length - 1],
    previous: totalScore[totalScore.length - 2],
    result,
  };
}

/* --------------------------------------------------------------------------
   Conversations
   -------------------------------------------------------------------------- */

export type Turn = {
  /** Who is speaking: the child, the peer in the scenario, or the coach. */
  from: "child" | "peer" | "coach";
  text: string;
};

export type Conversation = {
  id: string;
  /** Course id from `lib/courses.ts`. */
  courseId: string;
  courseName: string;
  date: string;
  /** How long the session ran, in seconds. */
  seconds: number;
  /** What happened, in one line — the list shows this before the transcript. */
  note: string;
  turns: Turn[];
};

/**
 * What a parent opens instead of a video: the words themselves. Sample
 * transcripts from the playground scenario, newest first.
 */
export const conversations: Conversation[] = [
  {
    id: "chat-2026-09-12",
    courseId: "playground",
    courseName: "Meet friends at the playground",
    date: "2026-09-12",
    seconds: 284,
    note: "Said hello first and waited for the answer.",
    turns: [
      { from: "coach", text: "First, notice what they are doing. Then choose one thing you would like to say." },
      { from: "peer", text: "We're building a castle!" },
      { from: "child", text: "Can I play with you?" },
      { from: "peer", text: "Sure! You can help us build the gate." },
      { from: "coach", text: "You asked, and then you waited for the answer. That is the hard part, and you did it." },
      { from: "child", text: "I want to build the gate." },
      { from: "peer", text: "Put the blue block on top!" },
      { from: "child", text: "Okay. Like this?" },
      { from: "peer", text: "Yes! Now it's tall." },
    ],
  },
  {
    id: "chat-2026-09-05",
    courseId: "playground",
    courseName: "Meet friends at the playground",
    date: "2026-09-05",
    seconds: 331,
    note: "Asked one question, then asked for a break.",
    turns: [
      { from: "coach", text: "Notice what they are playing, then choose one thing to say." },
      { from: "peer", text: "We're building a castle!" },
      { from: "child", text: "What are you building?" },
      { from: "peer", text: "A castle with a big gate. Do you want to help?" },
      { from: "child", text: "It is very loud here." },
      { from: "coach", text: "Saying that was a good idea. You can ask for a quiet minute whenever you need one." },
      { from: "child", text: "Can we stop for a bit?" },
      { from: "peer", text: "Okay. I'll keep your blocks for you." },
    ],
  },
  {
    id: "chat-2026-08-29",
    courseId: "playground",
    courseName: "Meet friends at the playground",
    date: "2026-08-29",
    seconds: 247,
    note: "Chose a reply from the suggestions and read it aloud.",
    turns: [
      { from: "coach", text: "Here are three things you could say. Tap one to hear how it sounds." },
      { from: "peer", text: "We're building a castle!" },
      { from: "child", text: "I like blocks too." },
      { from: "peer", text: "We're building a castle. Want to see?" },
      { from: "child", text: "Yes." },
      { from: "coach", text: "You answered straight away. Next time you could add one more word, like \u201cyes please\u201d." },
      { from: "peer", text: "Come on, it's over here." },
    ],
  },
];

/* --------------------------------------------------------------------------
   Formatting
   -------------------------------------------------------------------------- */

const monthDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** "12 Sep" — for axis ticks and card meta. */
export function shortDate(iso: string) {
  return monthDay.format(new Date(`${iso}T00:00:00Z`));
}

/** "12 September 2026" — for anything read as a sentence. */
export function longDate(iso: string) {
  return fullDate.format(new Date(`${iso}T00:00:00Z`));
}

/** "4:44" */
export function duration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}
