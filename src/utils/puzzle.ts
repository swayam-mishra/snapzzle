import type { Tile } from '../types';

export function captureFrame(video: HTMLVideoElement, w: number, h: number): ImageData {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

export function generateTiles(cols: number, rows: number): Tile[] {
  const tiles: Tile[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      tiles.push({ id: y * cols + x, origX: x, origY: y });
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  // Guard: if shuffle landed on solved state, swap two adjacent tiles
  while (isSolved(tiles)) {
    const i = 0;
    const j = 1;
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export function isSolved(tiles: Tile[]): boolean {
  return tiles.every((t, i) => t.id === i);
}

export function fmt(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}
