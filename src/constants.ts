import type { Difficulty } from './types';

// --- PALETTE ---
export const CLR_YELLOW  = '#ffea00';
export const CLR_RED     = '#ff0033';
export const CLR_BLUE    = '#004cff';
export const BG_DEEP     = '#0b1118';
export const BG_SURFACE  = '#213245';

// --- GAME TUNING ---
export const PINCH_THRESHOLD  = 0.05;
export const FRAME_THRESHOLD  = 0.1;
export const RESET_DWELL_MS   = 3000;
export const DROP_FRAMES      = 5;    // consecutive non-pinch frames required to drop

// --- DIFFICULTY GRID SIZES ---
export const GRID = {
  easy:   { cols: 3, rows: 3, label: 'Easy',   desc: '3 × 3' },
  medium: { cols: 4, rows: 4, label: 'Medium', desc: '4 × 4' },
  hard:   { cols: 5, rows: 5, label: 'Hard',   desc: '5 × 5' },
} satisfies Record<Difficulty, { cols: number; rows: number; label: string; desc: string }>;

// --- NEOBRUTALISM CLASS HELPERS ---
export const neo      = 'border-[3px] border-black shadow-[4px_4px_0px_0px_#000000]';
export const neoHover = 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#000000]';
export const neoActive = 'active:translate-x-[4px] active:translate-y-[4px] active:shadow-none';
export const neoBtn   = `${neo} ${neoHover} ${neoActive} transition-all duration-75 cursor-pointer`;
