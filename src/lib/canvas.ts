import { CLR_YELLOW } from '../constants';
import type { Tile, DragInfo } from '../types';

export function renderBoard(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement,
  tiles: Tile[],
  cols: number,
  rows: number,
  w: number,
  h: number,
  drag: DragInfo | null,
  hover: number | null,
) {
  const tw = w / cols, th = h / rows;
  const sw = src.width / cols, sh = src.height / rows;

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const drawTile = (t: Tile, dx: number, dy: number, dw: number, dh: number, lifted = false) => {
    ctx.save();
    if (lifted) {
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 14;
      ctx.strokeStyle = CLR_YELLOW;
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
    }
    ctx.drawImage(src, t.origX * sw, t.origY * sh, sw, sh, dx, dy, dw, dh);
    ctx.strokeRect(dx + 0.5, dy + 0.5, dw - 1, dh - 1);
    ctx.restore();
  };

  tiles.forEach((tile, idx) => {
    const dx = (idx % cols) * tw;
    const dy = Math.floor(idx / cols) * th;

    if (drag && drag.index === idx) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(dx, dy, tw, th);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(dx + 0.5, dy + 0.5, tw - 1, th - 1);
    } else if (drag && hover === idx) {
      drawTile(tile, dx, dy, tw, th);
      ctx.fillStyle = `${CLR_YELLOW}28`;
      ctx.fillRect(dx, dy, tw, th);
      ctx.strokeStyle = CLR_YELLOW;
      ctx.lineWidth = 2;
      ctx.strokeRect(dx + 1, dy + 1, tw - 2, th - 2);
    } else {
      drawTile(tile, dx, dy, tw, th);
    }
  });

  if (drag) {
    const dw = tw * 1.08, dh = th * 1.08;
    drawTile(tiles[drag.index], drag.x - dw / 2, drag.y - dh / 2, dw, dh, true);
  }
}

export function drawBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  size = 26,
  lw = 3,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'square';

  const corners: [number, number, number, number, number, number][] = [
    [x, y + size, x, y, x + size, y],
    [x + w - size, y, x + w, y, x + w, y + size],
    [x, y + h - size, x, y + h, x + size, y + h],
    [x + w - size, y + h, x + w, y + h, x + w, y + h - size],
  ];

  for (const [x1, y1, mx, my, x2, y2] of corners) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(mx, my);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}
