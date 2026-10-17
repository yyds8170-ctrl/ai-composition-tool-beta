// P5 光位诊断 —— COMPOSITION-SPEC §5 (规则树, 可解释)
import type { LightPattern, LightReport } from "./types.js";

export interface LightInput { gray: Uint8Array; width: number; height: number; face?: { x: number; y: number; size: number } | null }

export function diagnoseLight(input: LightInput): LightReport {
  const { gray, width, height } = input;
  let over = 0, under = 0, total = 0, sum = 0;
  for (let i = 0; i < gray.length; i += 7) {   // 7 步长降采样
    const v = gray[i]; total++;
    sum += v;
    if (v > 243) over++;
    if (v < 14) under++;
  }
  const overexposed = over / total, underexposed = under / total;
  const hints: string[] = [];
  let pattern: LightPattern = "unknown";
  let ratio = 0;
  if (input.face) {
    const f = input.face;
    const half = Math.max(4, Math.round(f.size / 2));
    const noseX = Math.round(f.x);
    let lSum = 0, lN = 0, rSum = 0, rN = 0;
    for (let dy = -half; dy <= half; dy += 2) for (let dx = -half; dx <= half; dx += 2) {
      const x = noseX + dx, y = Math.round(f.y) + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const v = gray[y * width + x];
      if (dx < 0) { lSum += v; lN++; } else { rSum += v; rN++; }
    }
    const L = lSum / Math.max(1, lN), R = rSum / Math.max(1, rN);
    ratio = Math.abs(L - R) / Math.max(L, R, 1e-6);
    if (ratio < 0.12) { pattern = "flat"; hints.push("光线平坦: 让主体侧转 30-45° 或光源偏离相机轴"); }
    else if (ratio > 0.75) { pattern = "split"; hints.push("分割光: 高对比戏剧感, 如需柔和可加反光板补暗侧"); }
    else { pattern = "loop"; hints.push("环状光: 安全默认光位"); }
  } else {
    hints.push("无人脸: 仅输出全局曝光诊断");
  }
  if (overexposed > 0.05) hints.push("过曝区域偏高: 降低曝光或避开高光");
  if (underexposed > 0.08) hints.push("欠曝区域偏高: 提亮或补光");
  return { pattern, ratio, overexposed, underexposed, hints };
}
