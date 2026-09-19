/** The landing page's mascot, so the child meets the same face inside. */
export function SproutMascot({ size = 132 }: { size?: number }) {
  return (
    <svg viewBox="0 0 220 220" width={size} height={size} aria-hidden="true" focusable="false">
      <g>
        <path d="M108 70c-6-30-32-44-56-42-3 26 17 48 47 50z" fill="#8ECB9F" />
        <path d="M112 70c8-28 33-40 55-36 2 25-19 46-47 48z" fill="#A9D9B6" />
        <path d="M110 96V56" stroke="#6FB585" strokeWidth="8" strokeLinecap="round" fill="none" />
      </g>
      <g>
        <circle cx="110" cy="136" r="62" fill="#C6E7DD" />
        <circle cx="110" cy="136" r="62" fill="none" stroke="#fff" strokeWidth="7" />
        <ellipse cx="78" cy="150" rx="12" ry="8" fill="#F8AEB2" opacity=".75" />
        <ellipse cx="142" cy="150" rx="12" ry="8" fill="#F8AEB2" opacity=".75" />
        <circle cx="90" cy="128" r="7.5" fill="#21313A" />
        <circle cx="130" cy="128" r="7.5" fill="#21313A" />
        <path d="M94 152q16 13 32 0" fill="none" stroke="#21313A" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Sprout at icon size: the same two leaves and round face, simplified so it
 * still reads at 20px. Used wherever the product signs its name — the tutorial
 * header and both dashboard headers — so the brand mark is one thing.
 */
export function MascotMark({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <path d="M15.3 9.6C14.4 5.3 10.6 3 6.9 3.4c-.4 3.9 2.6 7.2 7.2 7.5z" fill="#8ECB9F" />
      <path d="M16.7 9.6c1.2-4.1 4.9-6 8.4-5.4.3 3.8-2.9 6.9-7.2 7.2z" fill="#A9D9B6" />
      <path d="M16 13.6V8" stroke="#6FB585" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="20.4" r="9.3" fill="#C6E7DD" />
      <circle cx="16" cy="20.4" r="9.3" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="12.7" cy="19.2" r="1.4" fill="#21313A" />
      <circle cx="19.3" cy="19.2" r="1.4" fill="#21313A" />
      <path d="M13.2 22.9q2.8 2.2 5.6 0" fill="none" stroke="#21313A" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
