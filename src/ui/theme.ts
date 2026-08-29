import type { Essence } from '../game/types';

/** Accent colour per class essence. */
export const ESSENCE_COLOR: Record<Essence, string> = {
  bone: '#e8dcc0',
  spirit: '#8fd3ff',
  blood: '#c8323c',
  flesh: '#9bc53d',
};

export const ESSENCE_NAME: Record<Essence, string> = {
  bone: 'Bone',
  spirit: 'Spirit',
  blood: 'Blood',
  flesh: 'Flesh',
};
