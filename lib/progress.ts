/**
 * Which courses a child has finished.
 *
 * This is a prototype, so progress lives in the browser rather than in an
 * account: it survives a reload on the same device and nothing more. Every
 * read and write is guarded, because storage can be blocked or full and a
 * dashboard that throws is worse than one that forgets.
 *
 * It is exposed as an external store so a component can read it with
 * `useSyncExternalStore` — the server renders a fresh start, the browser
 * swaps in the real list, and a second tab finishing a course updates both.
 */

const KEY = "sprout.progress.v1";

const EMPTY: string[] = [];
const listeners = new Set<() => void>();

/* Snapshots have to be referentially stable, so the parsed list is cached and
   only rebuilt when the stored string itself changes. */
let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

function parse(raw: string | null): string[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** The finished course ids, newest last. */
export function progressSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = parse(raw);
    }
    return cachedValue;
  } catch {
    return EMPTY;
  }
}

/** Server and first paint: nobody has finished anything yet. */
export function serverProgressSnapshot(): string[] {
  return EMPTY;
}

export function subscribeProgress(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function write(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* Storage is unavailable; this run simply is not remembered. */
  }
  listeners.forEach((listener) => listener());
}

/** Called when a practice session reaches the end. */
export function markCourseComplete(courseId: string) {
  const current = progressSnapshot();
  if (current.includes(courseId)) return current;
  const next = [...current, courseId];
  write(next);
  return next;
}

export function resetProgress() {
  write([]);
}
