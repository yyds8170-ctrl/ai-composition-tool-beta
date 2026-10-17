// P2 视线留白 —— COMPOSITION-SPEC §2
import type { FaceLandmarks } from "./types.js";
import { FACE } from "./types.js";

export interface NoseRoomResult { facing: 1 | -1; frontSpace: number; target: number; needMove: boolean }

const TARGET = 0.30;   // KB §2.2 目标 1/4~1/3

export function analyzeNoseRoom(face: FaceLandmarks): NoseRoomResult {
  const pts = face.points;
  const nose = pts[FACE.NOSE_TIP], le = pts[FACE.LEFT_EYE_OUTER], re = pts[FACE.RIGHT_EYE_OUTER];
  const eyesMid = (le.x + re.x) / 2;
  const gaze = nose.x - eyesMid;                        // 平面朝向近似
  const facing: 1 | -1 = gaze >= 0 ? 1 : -1;
  const faceOuterX = facing > 0 ? Math.max(re.x, nose.x) : Math.min(le.x, nose.x);
  const frontSpace = facing > 0 ? 1 - faceOuterX : faceOuterX;
  return { facing, frontSpace, target: TARGET, needMove: frontSpace < TARGET * 0.6 };
}
