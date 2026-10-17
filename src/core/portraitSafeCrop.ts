// P1 人像保护裁切 —— COMPOSITION-SPEC §1
import type { CropResult, CropWindow, Interval, PoseLandmarks, ScoreDetail, SegMask } from "./types.js";
import { POSE } from "./types.js";
import { contentPreservation, computeRoD } from "./regionOfDetail.js";

export interface SafeCropInput {
  pose: PoseLandmarks | null;
  frameW: number; frameH: number;
  aspectRatio: number;              // w/h, e.g. 0.8 (4:5)
  mask: SegMask | null;             // RoD 可选
  faceAnchor?: { x: number; y: number } | null;
  gridMode?: "thirds" | "golden";
  marginScale?: number;             // 默认 1.6
}

const W = { composition: 0.30, jointSafety: 0.35, leadRoom: 0.15, boundary: 0.10, content: 0.10 };

/** §1.1 关节禁区带: 每关节 y±2% 帧高 */
export function forbiddenBands(pose: PoseLandmarks, frameH: number): Interval[] {
  const h = 0.02 * frameH;
  const joints = [...POSE.ANKLES, ...POSE.KNEES, ...POSE.HIPS, ...POSE.WRISTS, ...POSE.ELBOWS, ...POSE.SHOULDERS]
    .map(i => pose.points[i]).filter(p => p && (p.visibility === undefined || p.visibility > 0.5));
  const bands: Interval[] = joints.map(p => ({ lo: p.y - h, hi: p.y + h }));
  // 颈部 = 双肩中点
  const ls = pose.points[POSE.SHOULDERS[0]], rs = pose.points[POSE.SHOULDERS[1]];
  if (ls && rs) bands.push({ lo: (ls.y + rs.y) / 2 - h, hi: (ls.y + rs.y) / 2 + h });
  return bands;
}

/** §1.1 节段安全锚点: 相邻关节中点沿骨段方向偏移 ±3% 帧高 (避开 mid-bone) */
export function safeAnchors(pose: PoseLandmarks, frameH: number): number[] {
  const off = 0.03 * frameH;
  const segs: Array<[number, number]> = [
    [POSE.HIPS[0], POSE.KNEES[0]], [POSE.KNEES[0], POSE.ANKLES[0]],   // 左腿
    [POSE.HIPS[1], POSE.KNEES[1]], [POSE.KNEES[1], POSE.ANKLES[1]],   // 右腿
    [POSE.SHOULDERS[0], POSE.ELBOWS[0]], [POSE.ELBOWS[0], POSE.WRISTS[0]],
  ];
  const pts = pose.points;
  const anchors: number[] = [];
  for (const [a, b] of segs) {
    const pa = pts[a], pb = pts[b];
    if (!pa || !pb) continue;
    const mid = (pa.y + pb.y) / 2;
    anchors.push(mid - off, mid + off);   // 中点两侧 1/3 处
  }
  return anchors.filter(y => y > 0);
}

/** §1.3 关节安全分: 窗上下边缘与所有禁区带的最小距离, 触碰即 0 */
function jointSafety(top: number, bottom: number, bands: Interval[]): number {
  let min = 1;
  for (const b of bands) {
    const edgeHit = (top >= b.lo && top <= b.hi) || (bottom >= b.lo && bottom <= b.hi);
    if (edgeHit) return 0;
    const d = Math.min(Math.abs(top - b.lo), Math.abs(top - b.hi), Math.abs(bottom - b.lo), Math.abs(bottom - b.hi));
    min = Math.min(min, d);
  }
  return Math.min(1, min / (0.05 * (bottom - top)));
}

function compositionScore(face: { x: number; y: number } | undefined, win: CropWindow, mode: "thirds" | "golden"): number {
  if (!face) return 0.5;
  const t = mode === "golden" ? [0.382, 0.618] : [1 / 3, 2 / 3];
  const pts = [t[0], t[1]].flatMap(f => [ { x: f * win.w + win.x, y: t[0] * win.h + win.y }, { x: f * win.w + win.x, y: t[1] * win.h + win.y } ]);
  let min = 1;
  for (const p of pts) {
    const d = Math.hypot(p.x - face.x, p.y - face.y) / Math.hypot(win.w, win.h);
    min = Math.min(min, d);
  }
  return Math.max(0, 1 - min * 2);
}

function leadRoomScore(face: { x: number } | undefined, facing: 1 | -1, win: CropWindow, frameW: number): number {
  if (!face) return 0.5;
  const front = facing > 0 ? (win.x + win.w) - face.x : face.x - win.x;
  const back = facing > 0 ? face.x - win.x : (win.x + win.w) - face.x;
  const ratio = front / Math.max(back, 1);
  return Math.max(0, 1 - Math.abs(ratio - 2) / 2);   // 目标比值 2.0 (KB §2.2)
}

/** 主入口: 人像保护裁切 */
export function portraitSafeCrop(input: SafeCropInput): CropResult[] {
  const { pose, frameW, frameH, aspectRatio, mask, gridMode = "thirds", marginScale = 1.6 } = input;
  // MediaPipe 输出归一化 [0,1] —— 入口统一转像素, 内部全像素运算
  const posePx: PoseLandmarks | null = pose
    ? { points: pose.points.map(p => ({ x: p.x * frameW, y: p.y * frameH, visibility: p.visibility })) }
    : null;
  const bands = posePx ? forbiddenBands(posePx, frameH) : [];
  const anchors = posePx ? safeAnchors(posePx, frameH) : [frameH * 0.95, frameH * 0.85];
  const bodyW = posePx ? (() => {
    const xs = posePx.points.filter(p => p && (p.visibility === undefined || p.visibility > 0.5)).map(p => p.x);
    return xs.length ? Math.max(...xs) - Math.min(...xs) : frameW * 0.5;
  })() : frameW * 0.5;
  const cropW = Math.min(frameW, Math.max(bodyW * marginScale, frameW * 0.4));
  const cropH = cropW / aspectRatio;
  const face = input.faceAnchor ?? undefined;
  const results: CropResult[] = [];
  for (const yBottom of anchors) {
    const win: CropWindow = { x: Math.max(0, Math.min(frameW - cropW, (face?.x ?? frameW / 2) - cropW / 2)), y: Math.max(0, yBottom - cropH), w: cropW, h: Math.min(cropH, frameH) };
    if (win.y + win.h > frameH) continue;
    const js = jointSafety(win.y, win.y + win.h, bands);
    if (js === 0) continue;                                  // 禁区触碰直接淘汰
    const comp = compositionScore(face, win, gridMode);
    const lr = leadRoomScore(face, 1, win, frameW);
    const rod = mask ? computeRoD(mask) : null;
    const cp = mask ? contentPreservation(rod as never, win) : 0.95;
    const boundary = 0.85;                                    // 简化: 边界简洁性由蒙版边缘统计升级
    const total = W.composition * comp + W.jointSafety * js + W.leadRoom * lr + W.boundary * boundary + W.content * cp;
    results.push({ win, scores: { composition: comp, jointSafety: js, leadRoom: lr, boundary, content: cp, total } });
  }
  results.sort((a, b) => b.scores.total - a.scores.total);
  // §1.4 级联精修: Top1 做 ±3% 微扰
  if (results.length) {
    const top = results[0];
    for (const d of [-0.03, -0.015, 0.015, 0.03]) {
      const win = { ...top.win, y: Math.max(0, top.win.y + d * frameH) };
      if (win.y + win.h > frameH) continue;
      const js = jointSafety(win.y, win.y + win.h, bands);
      if (js === 0) continue;
      const total = W.composition * top.scores.composition + W.jointSafety * js + W.leadRoom * top.scores.leadRoom + W.boundary * top.scores.boundary + W.content * top.scores.content;
      if (total > top.scores.total) { top.win = win; top.scores.jointSafety = js; top.scores.total = total; }
    }
  }
  return results;
}
