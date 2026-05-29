import type { Difficulty } from './types';

// ── THEME-AWARE COLORS (CSS variables) ───────────────────────
// Use these in React component styles — they flip with light/dark mode.
export const CLR_PRIMARY   = 'var(--clr-primary)';
export const CLR_SECONDARY = 'var(--clr-secondary)';
export const CLR_ACCENT    = 'var(--clr-accent)';
export const CLR_BG        = 'var(--clr-bg)';
export const CLR_SURFACE   = 'var(--clr-surface)';
export const CLR_TEXT      = 'var(--clr-text)';
export const CLR_TEXT_MUTED = 'var(--clr-text-muted)';
export const CLR_BORDER    = 'var(--clr-border)';

// ── CANVAS COLORS (hex) ───────────────────────────────────────
// Canvas2D cannot read CSS variables, so these are fixed hex values
// chosen to be visible against a live camera feed.
export const CANVAS_ACCENT  = '#aa8dd8'; // wisteria-300  — frame brackets, highlights
export const CANVAS_CURSOR  = '#7830cf'; // indigo-500    — cursor ring/fill
export const CANVAS_BOARD   = '#6095d2'; // pale-sky-400  — board border

// ── DIFFICULTY GRID SIZES ─────────────────────────────────────
export const GRID = {
  easy:   { cols: 3, rows: 3, label: 'Easy',   desc: '3 × 3' },
  medium: { cols: 4, rows: 4, label: 'Medium', desc: '4 × 4' },
  hard:   { cols: 5, rows: 5, label: 'Hard',   desc: '5 × 5' },
} satisfies Record<Difficulty, { cols: number; rows: number; label: string; desc: string }>;

// ── GAME TUNING ───────────────────────────────────────────────
export const PINCH_THRESHOLD = 0.05;
export const FRAME_THRESHOLD = 0.1;
export const RESET_DWELL_MS  = 3000;
export const DROP_FRAMES     = 5;

// ── NEOBRUTALISM ──────────────────────────────────────────────
// CSS class names defined in index.css — these use CSS variables
// for border/shadow so they automatically adapt to light/dark mode.
export const neo    = 'neo';
export const neoBtn = 'neo-btn';
