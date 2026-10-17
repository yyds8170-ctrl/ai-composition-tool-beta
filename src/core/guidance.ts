// P6 拍前引导四条 —— COMPOSITION-SPEC §6
import type { Guidance } from "./types.js";
import type { NoseRoomResult } from "./noseRoom.js";

export function alignGuide(subjectBox: { x: number; y: number; w: number; h: number }, target: { x: number; y: number; w: number; h: number }): Guidance {
  const dcx = (target.x + target.w / 2) - (subjectBox.x + subjectBox.w / 2);
  const dcy = (target.y + target.h / 2) - (subjectBox.y + subjectBox.h / 2);
  const kind = Math.abs(dcx) > Math.abs(dcy) ? "align" : "align";
  const direction = Math.abs(dcx) > Math.abs(dcy) ? (dcx > 0 ? "move-right" : "move-left") : (dcy > 0 ? "move-down" : "move-up");
  const magnitude = Math.max(Math.abs(dcx), Math.abs(dcy));
  return { kind, direction, magnitude };
}

export function levelGuide(tiltDegrees: number): Guidance | null {
  if (Math.abs(tiltDegrees) <= 1.5) return null;   // SPEC: >1.5° 触发
  return { kind: "level", direction: tiltDegrees > 0 ? "rotate-ccw" : "rotate-cw", magnitude: Math.abs(tiltDegrees) };
}

export function roomGuide(nr: NoseRoomResult): Guidance | null {
  if (!nr.needMove) return null;
  return { kind: "room", direction: nr.facing > 0 ? "move-right" : "move-left", magnitude: nr.target - nr.frontSpace };
}

export function safetyGuide(cropBottomY: number, forbiddenBands: Array<{ lo: number; hi: number }>): Guidance | null {
  for (const b of forbiddenBands) {
    if (cropBottomY >= b.lo - 0.01 && cropBottomY <= b.hi + 0.03) {
      return { kind: "safety", direction: "move-back", magnitude: Math.abs(cropBottomY - b.lo) };
    }
  }
  return null;
}
