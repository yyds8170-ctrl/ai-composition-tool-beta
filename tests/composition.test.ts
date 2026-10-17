import { describe, it, expect } from "vitest";
import { portraitSafeCrop, forbiddenBands, safeAnchors } from "../src/core/portraitSafeCrop.js";
import { analyzeNoseRoom } from "../src/core/noseRoom.js";
import { snapPoint } from "../src/core/edgeSnap.js";
import { computeRoD, contentPreservation } from "../src/core/regionOfDetail.js";
import { diagnoseLight } from "../src/core/lightDiagnosis.js";
import { levelGuide, roomGuide, safetyGuide } from "../src/core/guidance.js";
import { POSE, type PoseLandmarks, type SegMask } from "../src/core/types.js";

const FW = 1000, FH = 1500;
// 合成站立人形: 头在(0.5,0.12), 肩(0.44/0.56,0.25), 髋(0.46/0.54,0.5), 膝(0.47/0.53,0.72), 踝(0.47/0.53,0.92)
function standingPose(): PoseLandmarks {
  const pts = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const set = (i: number, x: number, y: number) => { pts[i] = { x, y, visibility: 1 }; };
  set(POSE.SHOULDERS[0], 0.44, 0.25); set(POSE.SHOULDERS[1], 0.56, 0.25);
  set(POSE.HIPS[0], 0.46, 0.50); set(POSE.HIPS[1], 0.54, 0.50);
  set(POSE.KNEES[0], 0.47, 0.72); set(POSE.KNEES[1], 0.53, 0.72);
  set(POSE.ANKLES[0], 0.47, 0.92); set(POSE.ANKLES[1], 0.53, 0.92);
  set(POSE.ELBOWS[0], 0.38, 0.38); set(POSE.ELBOWS[1], 0.62, 0.38);
  set(POSE.WRISTS[0], 0.36, 0.50); set(POSE.WRISTS[1], 0.64, 0.50);
  return { points: pts };
}

describe("P1 人像保护裁切", () => {
  it("裁切窗边缘永不穿过关节禁区带", () => {
    const pose = standingPose();
    const bands = forbiddenBands(pose, FH);
    const results = portraitSafeCrop({ pose, frameW: FW, frameH: FH, aspectRatio: 0.8, mask: null, faceAnchor: { x: 500, y: 220 } });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const top = r.win.y, bottom = r.win.y + r.win.h;
      for (const b of bands) {
        const crossing = top <= b.hi && bottom >= b.lo;
        expect(crossing).toBe(false);   // ★验收: 穿关节率 = 0
      }
    }
  });
  it("最佳结果五准则得分齐全且 total 为加权合成", () => {
    const results = portraitSafeCrop({ pose: standingPose(), frameW: FW, frameH: FH, aspectRatio: 0.8, mask: null, faceAnchor: { x: 500, y: 220 } });
    const s = results[0].scores;
    expect(s.jointSafety).toBeGreaterThan(0);
    expect(s.total).toBeGreaterThan(0);
    expect(s.total).toBeLessThanOrEqual(1);
  });
});

describe("P2 视线留白", () => {
  it("朝右的脸 facing=1 且前方空间正确", () => {
    const pts = Array.from({ length: 478 }, (_, i) => ({ x: 0.5, y: 0.5 }));
    pts[33] = { x: 0.48, y: 0.5 }; pts[263] = { x: 0.52, y: 0.5 }; pts[1] = { x: 0.56, y: 0.52 };
    const r = analyzeNoseRoom({ points: pts });
    expect(r.facing).toBe(1);
    expect(r.frontSpace).toBeCloseTo(1 - 0.56, 5);
  });
  it("前方空间不足时 needMove=true", () => {
    const pts = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
    pts[33] = { x: 0.48, y: 0.5 }; pts[263] = { x: 0.52, y: 0.5 }; pts[1] = { x: 0.97, y: 0.52 };
    const r = analyzeNoseRoom({ points: pts });
    expect(r.needMove).toBe(true);
  });
  it("roomGuide 输出引导", () => {
    expect(roomGuide({ facing: 1, frontSpace: 0.05, target: 0.3, needMove: true })?.direction).toBe("move-right");
  });
});

describe("P3 边缘吸附", () => {
  it("接近三分线的锚点被吸附", () => {
    const r = snapPoint({ x: 340, y: 500 }, "thirds", 1000, 1500);
    expect(r.snapped).toBe(true);
    expect(r.line.x).toBeCloseTo(333.33, 1);
  });
  it("远离吸附线的锚点不吸附", () => {
    const r = snapPoint({ x: 450, y: 560 }, "thirds", 1000, 1500);
    expect(r.snapped).toBe(false);
  });
});

describe("P4 RoD", () => {
  const w = 100, h = 100;
  const mask: SegMask = { width: w, height: h, data: new Uint8Array(w * h) };
  for (let y = 30; y < 70; y++) for (let x = 20; x < 80; x++) mask.data[y * w + x] = 255;
  it("最大连通域外接矩形正确", () => {
    const rod = computeRoD(mask)!;
    expect(rod.minX).toBe(20); expect(rod.maxX).toBe(79);
    expect(rod.minY).toBe(30); expect(rod.maxY).toBe(69);
  });
  it("完整覆盖时 contentPreservation=1", () => {
    const rod = computeRoD(mask)!;
    expect(contentPreservation(rod, { x: 0, y: 0, w: 100, h: 100 })).toBe(1);
  });
  it("裁掉一半时按比例返回", () => {
    const rod = computeRoD(mask)!;
    const cp = contentPreservation(rod, { x: 0, y: 0, w: 50, h: 100 });
    expect(cp).toBeGreaterThan(0.4); expect(cp).toBeLessThan(0.75);
  });
});

describe("P5 光位诊断", () => {
  const W = 200, H = 200;
  function grayWith(f: (x: number) => number): Uint8Array {
    const g = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = Math.max(0, Math.min(255, f(x)));
    return g;
  }
  it("左亮右暗 → split", () => {
    const g = grayWith(x => (x < W / 2 ? 200 : 40));
    const r = diagnoseLight({ gray: g, width: W, height: H, face: { x: 100, y: 100, size: 60 } });
    expect(r.pattern).toBe("split");
  });
  it("均匀亮度 → flat", () => {
    const g = grayWith(() => 128);
    const r = diagnoseLight({ gray: g, width: W, height: H, face: { x: 100, y: 100, size: 60 } });
    expect(r.pattern).toBe("flat");
  });
  it("过曝/欠曝统计", () => {
    const g = grayWith(x => (x < W * 0.1 ? 250 : 128));
    const r = diagnoseLight({ gray: g, width: W, height: H, face: null });
    expect(r.overexposed).toBeGreaterThan(0.03);
  });
});

describe("P6 引导器", () => {
  it("倾角 2° 触发水平引导, 1° 不触发", () => {
    expect(levelGuide(2)?.kind).toBe("level");
    expect(levelGuide(1)).toBeNull();
  });
  it("裁切线压禁区带触发安全引导", () => {
    const g = safetyGuide(0.501 * FH, [{ lo: 0.49 * FH, hi: 0.51 * FH }]);
    expect(g?.kind).toBe("safety");
  });
});
