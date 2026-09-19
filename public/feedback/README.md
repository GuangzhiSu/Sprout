# Feedback page

The calm celebration shown after a child finishes a scenario. Served directly
from `public/` at `/feedback/` with no extra dependencies or build step.

```
index.html        reward, actions and practice summary
assets/styles.css shared Sprout palette, scenery, responsive layout
assets/app.js     dynamic summary values and silent canvas celebration
```

## Dynamic summary

The page accepts optional query parameters so a completed scenario can supply
its result:

```
/feedback/?scenario=Playground&minutes=6&turns=4
```

All values are sanitized and capped before they are displayed.

## Interaction and motion

- The celebration plays once on entry.
- It has no sound and never blocks the page controls.
- `prefers-reduced-motion` removes canvas and ambient motion.
- The two next-step actions are large keyboard- and touch-friendly targets.
