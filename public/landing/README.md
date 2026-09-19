# Landing page

The page a child meets first. Served by Next.js from `public/`:

- URL: `/landing/`
- standalone: `python3 -m http.server 3000 --directory public/landing`

No build step and no dependencies — plain HTML, CSS and one small script.

```
index.html        the whole page: mascot, greeting, two doors
assets/styles.css scenery, mascot, doors, responsive rules
assets/app.js     tapping the mascot changes its line
```

## Who it is for

A child on the spectrum, usually with a parent nearby. That decides the design:

- **Two doors, nothing else.** `Start now!` goes to `/choose`, which asks who is
  holding the device and then opens `/student` or `/parent`; `See the tracking
  panel` goes straight to `/parent` for the grown-up. No feature lists, no
  marketing copy, no scrolling required to reach either one.
- **Short, literal sentences.** No idioms, no metaphors, no pressure words.
- **Low sensory load.** Nothing moves on its own except a slow sun and slow
  clouds; the mascot moves only when it is touched. `prefers-reduced-motion`
  stops all of it.
- **Big targets.** Both doors are large enough for an unsteady tap, with a
  visible press state and a dashed focus ring for keyboard use.
- **Soft, high-brightness / low-saturation palette** with dark text, so it
  stays calm without losing contrast.

Every colour is a CSS variable on `:root`, so re-theming happens in one place.

## If you add to this page

Keep it to one screen and keep the two doors as the only choices. Anything that
explains the product to an adult belongs elsewhere — a child does not need it,
and it is what makes a page feel busy.

The footer disclaimer (research prototype, not a medical device) is deliberate —
please keep it.
