import { GridOverlay, Point, StageSize } from '../../shared/interfaces';

export const HANDLE_RADIUS = 8;

export function totalInches(feet: number, inches: number): number {
  return feet * 12 + inches;
}

export function gridDivisions(stageSize: StageSize): { cols: number; rows: number } {
  const spacing = Math.max(1, stageSize.gridSpacingFt || 1);
  const cols = Math.max(1, Math.round(stageSize.widthFeet / spacing));
  const rows = Math.max(1, Math.round(stageSize.heightFeet / spacing));
  return { cols, rows };
}

export function defaultCorners(width: number, height: number, stageSize: StageSize): GridOverlay {
  const stageW = totalInches(stageSize.widthFeet, stageSize.widthInches) || 1;
  const stageH = totalInches(stageSize.heightFeet, stageSize.heightInches) || 1;
  const aspect = stageW / stageH;
  let gridW = width * 0.8;
  let gridH = gridW / aspect;
  if (gridH > height * 0.8) {
    gridH = height * 0.8;
    gridW = gridH * aspect;
  }
  const left = (width - gridW) / 2 / width;
  const top = (height - gridH) / 2 / height;
  const right = left + gridW / width;
  const bottom = top + gridH / height;
  return {
    topLeft: { x: left, y: top },
    topRight: { x: right, y: top },
    bottomLeft: { x: left, y: bottom },
    bottomRight: { x: right, y: bottom },
  };
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function bilerp(tl: Point, tr: Point, bl: Point, br: Point, u: number, v: number): Point {
  return lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
}

function toCanvas(p: Point, w: number, h: number): [number, number] {
  return [p.x * w, p.y * h];
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  corners: GridOverlay,
  w: number, h: number,
  cols: number, rows: number,
  selectedCorner?: keyof GridOverlay | null,
) {
  const { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br } = corners;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(0,255,120,0.85)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const [hx0, hy0] = toCanvas(bilerp(tl, tr, bl, br, 0, t), w, h);
    const [hx1, hy1] = toCanvas(bilerp(tl, tr, bl, br, 1, t), w, h);
    ctx.moveTo(hx0, hy0);
    ctx.lineTo(hx1, hy1);
  }
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i <= cols; i++) {
    const t = i / cols;
    const [vx0, vy0] = toCanvas(bilerp(tl, tr, bl, br, t, 0), w, h);
    const [vx1, vy1] = toCanvas(bilerp(tl, tr, bl, br, t, 1), w, h);
    ctx.moveTo(vx0, vy0);
    ctx.lineTo(vx1, vy1);
  }
  ctx.stroke();

  const cornerEntries: [keyof GridOverlay, Point][] = [
    ['topLeft', tl], ['topRight', tr], ['bottomLeft', bl], ['bottomRight', br],
  ];
  for (const [key, p] of cornerEntries) {
    const [cx, cy] = toCanvas(p, w, h);
    const isSelected = key === selectedCorner;
    ctx.beginPath();
    ctx.arc(cx, cy, isSelected ? HANDLE_RADIUS * 1.5 : HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,255,120,1)';
    ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,255,120,0.85)';
      ctx.lineWidth = 1.5;
    }
  }
}


export function hitTestCorner(
  ex: number, ey: number,
  corners: GridOverlay,
  w: number, h: number,
): keyof GridOverlay | null {
  const keys: (keyof GridOverlay)[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
  for (const key of keys) {
    const [cx, cy] = toCanvas(corners[key], w, h);
    if (Math.hypot(ex - cx, ey - cy) <= HANDLE_RADIUS + 4) return key;
  }
  return null;
}