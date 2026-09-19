# Landing page

Static marketing page for the project, served by Next.js from `public/`:

- dev / production URL: `/landing/`
- local, without the app: `python3 -m http.server 8000 --directory public/landing`

No build step and no dependencies — plain HTML, CSS and one small script.

```
index.html        structure and copy
assets/styles.css design tokens (colour, radius, shadow), components, responsive rules
assets/app.js     scenario tabs, scroll reveal, waitlist form (demo only, sends nothing)
```

## Conventions

- Colours follow the visual reference: light, high-brightness / low-saturation.
  Every colour is a CSS variable on `:root` (`--teal / --mint / --green / --blush /
  --coral / --lav / --cream`), so re-theming happens in one place.
- Layout follows the wireframe: top nav (site name, links, icon button, dark log-in
  pill) and a centred start button in the hero.
- Copy lives directly in `index.html` and is English only.

## Sections

1. Hero — positioning, start button, and an interactive scenario card
   (checkout / group work / first chat)
2. Why — the three pain points
3. Capabilities — agents with personality, optional multimodal sensing,
   clinician agent, tracking, personalised plans, a safe exit
4. Scenarios — library cards tagged core / bonus with levels
5. Tracking — panel mock: KPI tiles plus an engagement curve with peak and dip markers
6. Parents — the four steps of parent co-design
7. CTA + footer — waitlist and the disclaimer

The footer disclaimer (research prototype, not a medical device) is deliberate —
please keep it.
