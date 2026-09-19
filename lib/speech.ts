/**
 * Reading a line out loud, in a voice a child would recognise as another
 * child's.
 *
 * The browser's default voice is usually an adult one — often a deep male
 * synthetic read — which is the wrong thing to hand a child who is about to
 * copy it. Two things fix that: pick the youngest-sounding voice installed,
 * and lift the pitch, since a raised pitch is most of what makes a synthetic
 * voice read as young.
 *
 * Voices differ per device and can arrive after the page has loaded, so the
 * list is looked up lazily and everything degrades to the default voice.
 */

/** Some systems ship an actual child voice. Take it if it is there. */
const CHILD = [/child/i, /\bkid\b/i, /junior/i, /\bboy\b/i, /\bgirl\b/i];

/** Otherwise the lighter, brighter voices read closest to a child. */
const BRIGHT = [
  /female/i, /samantha/i, /karen/i, /moira/i, /tessa/i, /fiona/i, /serena/i,
  /victoria/i, /allison/i, /ava/i, /susan/i, /zira/i, /aria/i, /jenny/i,
  /michelle/i, /nicky/i, /amelie/i, /joanna/i, /salli/i, /ivy/i,
];

/** And these are the ones to step around. */
const DEEP = [
  /\bmale\b/i, /daniel/i, /\balex\b/i, /fred/i, /david/i, /george/i, /james/i,
  /\bguy\b/i, /oliver/i, /ryan/i, /\btom\b/i, /\bmark\b/i, /rishi/i, /aaron/i,
  /arthur/i, /gordon/i, /grandpa/i, /reed/i, /eddy/i, /rocko/i,
];

const matches = (patterns: RegExp[], name: string) => patterns.some((pattern) => pattern.test(name));

/**
 * Score the installed voices and return the most child-like English one.
 * Exported so the choice can be tested without a speaker.
 */
export function chooseVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) => /^en\b|^en[-_]/i.test(voice.lang));
  const pool = english.length > 0 ? english : voices;
  if (pool.length === 0) return null;

  const score = (voice: SpeechSynthesisVoice) => {
    const name = voice.name;
    if (matches(CHILD, name)) return 3;
    if (matches(DEEP, name)) return 0;
    if (matches(BRIGHT, name)) return 2;
    return 1;
  };

  return pool.reduce((best, voice) => (score(voice) > score(best) ? voice : best), pool[0]);
}

let cached: SpeechSynthesisVoice | null = null;

function voice(): SpeechSynthesisVoice | null {
  if (cached) return cached;
  const voices = window.speechSynthesis.getVoices();
  /* Chrome fills this list asynchronously; the first attempt may be empty and
     the next one, a moment later, will not be. */
  if (voices.length === 0) return null;
  cached = chooseVoice(voices);
  return cached;
}

/** Say one short line the way a child would say it. */
export function speakAsChild(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const utterance = new SpeechSynthesisUtterance(text);
  const picked = voice();
  if (picked) utterance.voice = picked;
  utterance.lang = picked?.lang ?? "en-US";
  /* A raised pitch is what turns an adult voice into a child's; the slower
     rate keeps it easy to copy. */
  utterance.pitch = 1.7;
  utterance.rate = 0.92;
  utterance.volume = 1;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
