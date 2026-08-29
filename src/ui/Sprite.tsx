import { useState } from 'react';
import { spriteUrl, type SpriteKind } from './sprites';

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

/** Sprite image with a graceful fallback while assets are still being generated. */
export default function Sprite({ kind, id, size = 64, alt = '', className }: SpriteProps) {
  const url = spriteUrl(kind, id);
  // Remember which url failed rather than a boolean, so a new url retries for free.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  if (brokenUrl === url) return <Silhouette size={size} className={className} />;

  return (
    <img
      src={url}
      width={size}
      height={size}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => setBrokenUrl(url)}
    />
  );
}
