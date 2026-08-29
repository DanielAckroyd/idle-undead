/** Tiny inline SVG iconography — no network fonts, no icon sprite sheet. */

interface IconProps {
  size?: number;
  className?: string;
}

export function GoldIcon({ size = 13, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <ellipse cx="8" cy="11" rx="6" ry="3.1" fill="#8a6b1e" />
      <ellipse cx="8" cy="9" rx="6" ry="3.1" fill="#c9a23c" />
      <ellipse cx="8" cy="6.4" rx="6" ry="3.1" fill="#f5d76e" />
      <ellipse cx="8" cy="6.2" rx="3.5" ry="1.6" fill="#fff3c4" opacity="0.65" />
    </svg>
  );
}

export function SoulIcon({ size = 13, className }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M8 1.2 9.6 6 14.4 8 9.6 10 8 14.8 6.4 10 1.6 8 6.4 6z"
        fill="#b98ff0"
      />
      <path d="M8 4.2 8.9 7.1 11.6 8 8.9 8.9 8 11.8 7.1 8.9 4.4 8 7.1 7.1z" fill="#e6d4ff" opacity="0.85" />
    </svg>
  );
}

export function MenuIcon({ size = 20, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path fill="currentColor" d="M4 6h16v2.2H4zM4 10.9h16v2.2H4zM4 15.8h16V18H4z" />
    </svg>
  );
}

export function GearIcon({ size = 22, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5m9.4 4.6.1-1.1-.1-1.1 2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.9-1.1L16.8 3h-4l-.4 2.4c-.7.3-1.3.7-1.9 1.1l-2.3-.9-2 3.4 2 1.5-.1 1.1.1 1.1-2 1.5 2 3.4 2.3-.9c.6.5 1.2.8 1.9 1.1l.4 2.4h4l.4-2.4c.7-.3 1.3-.6 1.9-1.1l2.3.9 2-3.4z"
      />
    </svg>
  );
}

/** Decorative emblem used behind the title while the painted menu art is missing. */
export function Sigil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.55">
        <circle cx="100" cy="100" r="78" />
        <circle cx="100" cy="100" r="68" strokeDasharray="3 7" />
      </g>
      <g fill="currentColor" opacity="0.5">
        <path d="M100 44c-24 0-42 17.5-42 40 0 12 5.5 20 11 25.5V124c0 4 3 7 7 7h6v10c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-10h9v10c0 2.5 2 4.5 4.5 4.5s4.5-2 4.5-4.5v-10h6c4 0 7-3 7-7v-14.5c5.5-5.5 11-13.5 11-25.5 0-22.5-18-40-42-40z" />
      </g>
      <g fill="#08080b">
        <ellipse cx="84" cy="88" rx="10" ry="12" />
        <ellipse cx="116" cy="88" rx="10" ry="12" />
        <path d="M96 106h8l-4 9z" />
      </g>
      <g stroke="currentColor" strokeWidth="2" opacity="0.35" strokeLinecap="round">
        <path d="M100 6v18M100 176v18M6 100h18M176 100h18" />
        <path d="M33 33l13 13M167 33l-13 13M33 167l13-13M167 167l-13-13" />
      </g>
    </svg>
  );
}
