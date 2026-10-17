// P3 边缘吸附 —— COMPOSITION-SPEC §3
import type { GridMode, Pt } from "./types.js";

export interface SnapResult { dx: number; dy: number; snapped: boolean; line: { x?: number; y?: number } }

const GOLDEN = [0.382, 0.618];

export function gridLines(mode: GridMode, w: number, h: number) {
  const t = mode === "golden" ? GOLDEN : [1 / 3, 2 / 3];
  return { vertical: t.map(f => f * w), horizontal: t.map(f => f * h) };
}

export function snapPoint(anchor: Pt, mode: GridMode, w: number, h: number, snapRadius = 0.04 * w): SnapResult {
  const g = gridLines(mode, w, h);
  let best = { dx: Infinity, dy: Infinity, snapped: false, line: {} as { x?: number; y?: number } };
  for (const lx of g.vertical) {
    const d = lx - anchor.x;
    if (Math.abs(d) <= snapRadius && Math.abs(d) < Math.abs(best.dx)) best = { dx: d, dy: best.dy, snapped: true, line: { x: lx } };
  }
  for (const ly of g.horizontal) {
    const d = ly - anchor.y;
    if (Math.abs(d) <= snapRadius && Math.abs(d) < Math.abs(best.dy)) best = { ...best, dy: d, snapped: true, line: { ...best.line, y: ly } };
  }
  if (!best.snapped) { best.dx = 0; best.dy = 0; }
  return best;
}
