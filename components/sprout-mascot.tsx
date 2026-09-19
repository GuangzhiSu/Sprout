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
