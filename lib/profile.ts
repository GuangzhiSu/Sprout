/**
 * What Sprout knows about the child.
 *
 * A name, an age and a few things they like — enough for the coach to speak to
 * them rather than at them. It is collected once in the tutorial and kept in
 * the browser, the same as their course progress: this is a prototype, there
 * are no accounts, and a child's details should not be sitting on a server
 * that does not need them. It leaves the device only as part of a coach
 * request, so the model can pitch its wording.
 */

const KEY = "sprout.profile.v1";

export type Profile = {
  name: string;
  /** null when they skipped the question. */
  age: number | null;
  likes: string[];
  tutorialDone: boolean;
};

export const emptyProfile: Profile = { name: "", age: null, likes: [], tutorialDone: false };

const listeners = new Set<() => void>();

/* Snapshots have to be referentially stable, so the parsed profile is cached
   and only rebuilt when the stored string itself changes. */
let cachedRaw: string | null = null;
let cachedValue: Profile = emptyProfile;

function parse(raw: string | null): Profile {
  if (!raw) return emptyProfile;
  try {
    const parsed = JSON.parse(raw) as Partial<Profile> | null;
    if (!parsed || typeof parsed !== "object") return emptyProfile;
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 24) : "",
      age: typeof parsed.age === "number" && Number.isFinite(parsed.age) ? parsed.age : null,
      likes: Array.isArray(parsed.likes) ? parsed.likes.filter((like): like is string => typeof like === "string").slice(0, 8) : [],
      tutorialDone: parsed.tutorialDone === true,
    };
  } catch {
    return emptyProfile;
  }
}

export function profileSnapshot(): Profile {
  if (typeof window === "undefined") return emptyProfile;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = parse(raw);
    }
    return cachedValue;
  } catch {
    return emptyProfile;
  }
}

/** Server and first paint: nobody has said who they are yet. */
export function serverProfileSnapshot(): Profile {
  return emptyProfile;
}

export function subscribeProfile(onChange: () => void) {
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

/** Merge a few fields into the stored profile. */
export function saveProfile(patch: Partial<Profile>): Profile {
  const next: Profile = { ...profileSnapshot(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Storage is unavailable; this run simply is not remembered. */
    }
  }
  listeners.forEach((listener) => listener());
  return next;
}

export function clearProfile() {
  saveProfile(emptyProfile);
}

/** What the coach is told about the child. Empty fields are left out. */
export function profileForModel(profile: Profile) {
  const payload: { name?: string; age?: number; likes?: string[] } = {};
  if (profile.name) payload.name = profile.name;
  if (profile.age !== null) payload.age = profile.age;
  if (profile.likes.length > 0) payload.likes = profile.likes;
  return Object.keys(payload).length > 0 ? payload : undefined;
}
