import { useState } from 'react';
import { artUrl, markArtMissing, spriteUrl, useArt, type SpriteKind } from './sprites';

interface SpriteProps {
  kind: SpriteKind;
  id: string;
  size?: number;
  alt?: string;
  className?: string;
}

function Silhouette({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M32 7c-11 0-19 7.6-19 17.5 0 6.2 3 9.6 3 14.5v3h32v-3c0-4.9 3-8.3 3-14.5C51 14.6 43 7 32 7z"
        fill="currentColor"
        opacity="0.32"
      />
      <circle cx="24" cy="28" r="5" fill="#08080b" opacity="0.75" />
      <circle cx="40" cy="28" r="5" fill="#08080b" opacity="0.75" />
      <path d="M29 36h6l-3 6z" fill="#08080b" opacity="0.75" />
      <rect x="21" y="45" width="22" height="11" rx="3" fill="currentColor" opacity="0.22" />
    </svg>
  );
}

/**
 * Painted PNG first, generated SVG next, inline silhouette last.
 * The PNG is only used once a probe has confirmed it loads, so a missing
 * painted asset never flashes a broken image.
 */
export default function Sprite({ kind, id, size = 64, alt = '', className }: SpriteProps) {
  const png = artUrl(kind, id);
  const svg = spriteUrl(kind, id);
  const src = useArt(png, svg);
  // Remember which url failed rather than a boolean, so a new url retries for free.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  if (src === svg && brokenUrl === svg) return <Silhouette size={size} className={className} />;

  // Tag which tier of asset won, so CSS can size the chunky placeholder art more
  // conservatively than a painted 512px PNG.
  const cls = [className, src === png ? 'art-png' : 'art-svg'].filter(Boolean).join(' ');

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt={alt}
      className={cls}
      draggable={false}
      onError={() => {
        if (src === png) markArtMissing(png);
        else setBrokenUrl(svg);
      }}
    />
  );
}
