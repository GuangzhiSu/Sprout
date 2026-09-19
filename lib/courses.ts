/**
 * Course catalogue for the student view.
 *
 * Courses are grouped into levels and are taken in order: a course opens only
 * once every course before it is finished, and a level opens only once the
 * level before it is complete. A course either points at a scenario that
 * exists in `lib/scenarios.ts` (`scenarioId` set) or is still being written
 * (`scenarioId: null`), in which case the card says so instead of pretending.
 */

export type Course = {
  id: string;
  /** Short, literal name a child can read. */
  name: string;
  /** One line about what happens in it. */
  blurb: string;
  /** The scenario this card opens, or null while it is still being made. */
  scenarioId: string | null;
  /** Roughly how long one run takes. */
  minutes: number;
  /** Decorative tile: an emoji plus the palette key used behind it. */
  emoji: string;
  tile: "mint" | "sky" | "sun" | "lav" | "blush" | "sand";
};

export type Level = {
  id: string;
  /** "Level 1", "Level 2" — kept as its own field so the badge stays short. */
  label: string;
  name: string;
  /** What a child can already do by the end of the level. */
  goal: string;
};

export type LevelWithCourses = Level & { courses: Course[] };

export const levels: LevelWithCourses[] = [
  {
    id: "level-1",
    label: "Level 1",
    name: "Saying hello",
    goal: "Walk up to someone, say one thing, and wait for the answer.",
    courses: [
      {
        id: "playground",
        name: "Meet friends at the playground",
        blurb: "Two children are building a castle. Go and say hello.",
        scenarioId: "playground",
        minutes: 5,
        emoji: "🏰",
        tile: "mint",
      },
      {
        id: "new-classmate",
        name: "Say hello to a new classmate",
        blurb: "Someone new sits down next to you.",
        scenarioId: null,
        minutes: 5,
        emoji: "🎒",
        tile: "sky",
      },
      {
        id: "asking-to-join",
        name: "Ask to join a game",
        blurb: "A ball game has already started. Ask if you can play.",
        scenarioId: null,
        minutes: 6,
        emoji: "⚽",
        tile: "sun",
      },
    ],
  },
  {
    id: "level-2",
    label: "Level 2",
    name: "Keeping it going",
    goal: "Ask a second question, take turns, and say when you need a break.",
    courses: [
      {
        id: "sharing-a-toy",
        name: "Share a toy",
        blurb: "You both want the same truck. Find a way to take turns.",
        scenarioId: null,
        minutes: 6,
        emoji: "🚚",
        tile: "lav",
      },
      {
        id: "birthday-party",
        name: "Join a birthday party",
        blurb: "The room is loud. Find one person to talk to.",
        scenarioId: null,
        minutes: 7,
        emoji: "🎂",
        tile: "blush",
      },
      {
        id: "asking-for-a-break",
        name: "Ask for a break",
        blurb: "It is getting too noisy. Say so, kindly.",
        scenarioId: null,
        minutes: 4,
        emoji: "🌿",
        tile: "sand",
      },
    ],
  },
  {
    id: "level-3",
    label: "Level 3",
    name: "Sorting it out",
    goal: "Fix a small mix-up, say sorry, and make a plan with someone.",
    courses: [
      {
        id: "someone-is-upset",
        name: "Notice someone is upset",
        blurb: "Your friend has gone quiet. Ask what happened.",
        scenarioId: null,
        minutes: 6,
        emoji: "🫂",
        tile: "sky",
      },
      {
        id: "saying-sorry",
        name: "Say sorry",
        blurb: "You knocked over their tower by accident.",
        scenarioId: null,
        minutes: 5,
        emoji: "🧱",
        tile: "blush",
      },
      {
        id: "making-a-plan",
        name: "Make a plan together",
        blurb: "You both want to play, but different games.",
        scenarioId: null,
        minutes: 7,
        emoji: "🗺️",
        tile: "mint",
      },
    ],
  },
];

/** Every course, in the order they are taken. */
export function listCourses(): Course[] {
  return levels.flatMap((level) => level.courses);
}

export function getCourse(id: string): Course | null {
  return listCourses().find((course) => course.id === id) ?? null;
}

/** Where a course card goes when it is tapped. */
export function courseHref(course: Course) {
  return course.scenarioId ? `/?scenario=${course.scenarioId}` : null;
}

export type CourseState =
  /** Finished — it stays open, so it can be practised again. */
  | "done"
  /** The one to do next. */
  | "current"
  /** Open, but the scenario behind it is not written yet. */
  | "soon"
  /** Not open until the courses before it are finished. */
  | "locked";

export type LevelState = "open" | "locked";

/**
 * Work out where a child is.
 *
 * One rule covers both the course order and the level order: a course is open
 * only when every course before it in the catalogue is finished. So Level 2
 * opens exactly when the last course of Level 1 is done.
 */
export function courseStates(completed: readonly string[]): Record<string, CourseState> {
  const done = new Set(completed);
  const states: Record<string, CourseState> = {};
  let reachedTheEdge = false;

  for (const course of listCourses()) {
    if (done.has(course.id)) {
      states[course.id] = "done";
      continue;
    }
    if (reachedTheEdge) {
      states[course.id] = "locked";
      continue;
    }
    // The first unfinished course is the one to do next.
    reachedTheEdge = true;
    states[course.id] = course.scenarioId ? "current" : "soon";
  }

  return states;
}

/** A level is open once its first course is. */
export function levelStates(completed: readonly string[]): Record<string, LevelState> {
  const states = courseStates(completed);
  return Object.fromEntries(
    levels.map((level) => [
      level.id,
      level.courses.some((course) => states[course.id] !== "locked") ? "open" : "locked",
    ]),
  );
}
