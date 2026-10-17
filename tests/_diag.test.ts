
import { it, expect } from "vitest";
import { portraitSafeCrop, forbiddenBands, safeAnchors } from "../src/core/portraitSafeCrop.js";
import { POSE, type PoseLandmarks } from "../src/core/types.js";
const FW = 1000, FH = 1500;
it("diag", () => {
  const pts = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  const set = (i: number, x: number, y: number) => { pts[i] = { x, y, visibility: 1 }; };
  set(11,0.44,0.25); set(12,0.56,0.25); set(23,0.46,0.50); set(24,0.54,0.50);
  set(25,0.47,0.72); set(26,0.53,0.72); set(27,0.47,0.92); set(28,0.53,0.92);
  set(13,0.38,0.38); set(14,0.62,0.38); set(15,0.36,0.50); set(16,0.64,0.50);
  const pose: PoseLandmarks = { points: pts };
  const bands = forbiddenBands(pose, FH).map(b => [Math.round(b.lo), Math.round(b.hi)]);
  const anchors = safeAnchors(pose, FH).map(v => Math.round(v));
  console.log("BANDS:", JSON.stringify(bands));
  console.log("ANCHORS:", JSON.stringify(anchors));
  const r = portraitSafeCrop({ pose, frameW: FW, frameH: FH, aspectRatio: 0.8, mask: null, faceAnchor: { x: 500, y: 220 } });
  console.log("RESULTS:", r.length, r[0] ? JSON.stringify(r[0]) : "NONE");
  expect(true).toBe(true);
});
