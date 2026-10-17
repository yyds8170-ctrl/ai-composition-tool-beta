// P4 背景保护 RoD —— COMPOSITION-SPEC §4
import type { CropWindow, SegMask } from "./types.js";

export interface RoD { minX: number; minY: number; maxX: number; maxY: number; area: number }

export function computeRoD(mask: SegMask, threshold = 128): RoD | null {
  const { width: w, height: h, data } = mask;
  const seen = new Uint8Array(w * h);
  let best: RoD | null = null;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start] < threshold) continue;
    stack.length = 0; stack.push(start); seen[start] = 1;
    let minX = w, minY = h, maxX = 0, maxY = 0, area = 0;
    while (stack.length) {
      const idx = stack.pop()!;
      const x = idx % w, y = (idx / w) | 0;
      area++;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (x > 0 && !seen[idx - 1] && data[idx - 1] >= threshold) { seen[idx - 1] = 1; stack.push(idx - 1); }
      if (x < w - 1 && !seen[idx + 1] && data[idx + 1] >= threshold) { seen[idx + 1] = 1; stack.push(idx + 1); }
      if (y > 0 && !seen[idx - w] && data[idx - w] >= threshold) { seen[idx - w] = 1; stack.push(idx - w); }
      if (y < h - 1 && !seen[idx + w] && data[idx + w] >= threshold) { seen[idx + w] = 1; stack.push(idx + w); }
    }
    if (!best || area > best.area) best = { minX, minY, maxX, maxY, area };
  }
  return best;
}

/** 主体完整性: RoD 被裁切窗覆盖的比例, >=0.98 视为完整 (SPEC §4) */
export function contentPreservation(rod: RoD | null, win: CropWindow): number {
  if (!rod) return 1;
  const ix = Math.max(0, Math.min(win.x + win.w, rod.maxX + 1) - Math.max(win.x, rod.minX));
  const iy = Math.max(0, Math.min(win.y + win.h, rod.maxY + 1) - Math.max(win.y, rod.minY));
  const rodArea = (rod.maxX - rod.minX + 1) * (rod.maxY - rod.minY + 1);
  if (rodArea <= 0) return 1;
  return Math.max(0, (ix * iy) / rodArea);
}
