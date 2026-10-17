// 数据契约 —— 对应 docs/COMPOSITION-SPEC.md §0
export interface Pt { x: number; y: number }
export interface Interval { lo: number; hi: number }
export interface CropWindow { x: number; y: number; w: number; h: number }
export interface Landmark { x: number; y: number; visibility?: number }
export interface PoseLandmarks { points: Landmark[] }   // MediaPipe Pose, 33 pts
export interface FaceLandmarks { points: Landmark[] }   // MediaPipe Face, 478 pts
export interface SegMask { width: number; height: number; data: Uint8Array }
export interface ScoreDetail {
  composition: number; jointSafety: number; leadRoom: number;
  boundary: number; content: number; total: number;
}
export interface CropResult { win: CropWindow; scores: ScoreDetail }
export type GridMode = "thirds" | "golden";
export type LightPattern = "flat" | "loop" | "butterfly" | "rembrandt" | "split" | "unknown";
export interface LightReport { pattern: LightPattern; ratio: number; overexposed: number; underexposed: number; hints: string[] }
export interface Guidance { kind: "align" | "level" | "room" | "safety"; direction: string; magnitude: number }

// MediaPipe Pose 关键点索引（标准约定）
export const POSE = {
  ANKLES: [27, 28], KNEES: [25, 26], HIPS: [23, 24],
  WRISTS: [15, 16], ELBOWS: [13, 14], SHOULDERS: [11, 12],
  NOSE: 0,
} as const;
// MediaPipe Face 关键点索引（标准约定）
export const FACE = { LEFT_EYE_OUTER: 33, RIGHT_EYE_OUTER: 263, NOSE_TIP: 1, CHIN: 152, FOREHEAD: 10 } as const;
