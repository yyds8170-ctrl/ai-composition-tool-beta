# 构图算法规格（COMPOSITION-SPEC v1.0）

> 本文档将 PHOTOGRAPHY-KB 中的知识转化为可实现的算法规格。全部为原创设计（依据公开摄影理论与学术方法），配合阶段 2 选定的 MediaPipe 模型输出。

---

## 0. 数据契约（输入）

```ts
// MediaPipe Face Landmarker（478 点）
interface FaceLandmarks { points: Array<{x,y,z}>; }        // 归一化 [0,1]
// MediaPipe Pose Landmarker（33 点）
interface PoseLandmarks { points: Array<{x,y,z,visibility}>; }
// MediaPipe Selfie Segmentation
interface SegMask { width: number; height: number; mask: Uint8Array; }  // 每像素 0-255
```
**关键点索引约定**（MediaPipe 标准）：
- Face：左眼外角 33 / 右眼外角 263 / 鼻尖 1 / 左右瞳孔 468,473 / 下颌 152 / 眉上 10
- Pose：踝 27,28 / 膝 25,26 / 髋 23,24 / 腕 15,16 / 肘 13,14 / 肩 11,12 / 脚尖 31,32

---

## 1. 模块 P1：人像保护裁切（Portrait-Safe Crop）

### 1.1 关节禁区带构建
```
输入: PoseLandmarks (或 FaceLandmarks 推断的躯干方向，无人脸时降级)
步骤:
  1. 关节集合 J = {踝, 膝, 髋, 腕, 肘, 肩, 颈}
  2. 每个关节 j 生成禁区带 Band(j) = [j.y - h_j, j.y + h_j]
     h_j = 0.02 * frameHeight   // 禁区带宽 = 帧高 2%（可调参）
  3. 节段安全点 S = 相邻关节中点向外偏移（小腿中/大腿中/上臂中/前臂中）
     S_i = midpoint(J_a, J_b) 再沿骨段方向偏移 ±0.03 * frameHeight
     （偏移目的: 避开 mid-bone 雷区，落在 KB §1.4 的"节段 1/3 处"）
输出: ForbiddenBands: Interval[], SafeAnchors: y[]
```

### 1.2 候选裁切窗生成
```
输入: 主体框 subjectBox（Pose 包络 ∪ Face 包络）, 目标宽高比 r, ForbiddenBands
步骤:
  1. 裁切窗下沿 y_bottom ∈ SafeAnchors 中选取（距主体框下沿最近的安全点）
  2. 上沿 y_top 由 r 反推: y_top = y_bottom - cropH, cropH = cropW / r
  3. cropW = max(主体框宽 × marginScale, 最小框宽), marginScale 默认 1.6
  4. 若 y_top < 0 → 整体下移；若仍越界 → 换下一个 SafeAnchor
输出: 候选窗列表 windows[]（按安全点数生成，通常 2-4 个）
```

### 1.3 多准则评分（每候选窗）
```
score(w) = w1*CompositionScore + w2*JointSafety + w3*LeadRoomScore
         + w4*BoundarySimplicity + w5*ContentPreservation
默认权重: w = [0.30, 0.35, 0.15, 0.10, 0.10]     // 关节安全权重最高
CompositionScore: 主体锚点（脸部中心）到最近力量点（三分/黄金可切换）的归一化距离（近者高分）
JointSafety:      窗边缘与所有 ForbiddenBands 的最小距离（触碰即 0）
LeadRoomScore:    朝向侧空间 / 背向侧空间 的比值映射（目标比值 2.0，KB §2.2）
BoundarySimplicity: 窗四边穿越分割蒙版边缘的次数（越少越简洁）
ContentPreservation: 窗内主体蒙版面积占比（RoD 完整性）
```

### 1.4 级联精修（两步法，借鉴 CCR）
```
粗选: windows 按 score 排序取 Top-3
精修: 每候选窗做 ±3% 的微扰搜索（步长 1%，固定 r）→ 取 score 最高者
输出: 最终裁切框 + 各准则得分明细（可解释报告）
```

---

## 2. 模块 P2：视线留白（Nose Room）

```
输入: FaceLandmarks
朝向向量: gaze = normalize(鼻尖.x - 两眼中点.x)   // 平面近似 [D]
       （升级: 478 点虹膜中心相对眼角偏移 → 精细注视方向）
规则:
  facing = sign(gaze)                            // +1 右, -1 左
  frontSpace = facing>0 ? (1-faceOuterX) : faceOuterX     // 前方空间占比
  target = 0.30                                   // KB §2.2 目标 1/4~1/3
  提示: frontSpace < target*0.6 → "向{左|右}移动" 引导
裁切联动: 候选窗生成时朝向侧额外扩边（LeadRoomScore 已含）
```

---

## 3. 模块 P3：边缘吸附（edgeSnap）

```
吸附网格: 三分线（默认）/ 黄金分割（用户切换）
吸附对象: 主体锚点（脸部中心 / 主体框质心）
规则: 锚点距最近吸附线 < snapRadius(=帧宽 4%) → 输出平移建议（或直接微调裁切窗）
辅助线渲染: 九宫格 / 黄金螺旋（可选）/ 水平线
```

---

## 4. 模块 P4：背景保护 RoD（Region of Detail）

```
输入: SegMask
RoD 计算: 蒙版二值化(阈值 128) → 最大连通域 → 外接矩形 RoD
用途:
  1. ContentPreservation 评分: RoD ∩ cropWindow 面积 / RoD 面积 ≥ 0.98 才算"主体完整"
  2. 裁切保护: 裁切窗生成时 RoD 不可被切分（与 ForbiddenBands 同级约束）
  3. 发丝级升级: MODNet onnx 按需加载（精细 matting）
```

---

## 5. 模块 P5：光位诊断（四类 + 平光）

```
输入: FaceLandmarks + 帧亮度图（降采样灰度）
分割: 鼻尖水平线把脸分为左半/右半 → 各自平均亮度 L_left, L_right
光比: ratio = |L_left - L_right| / max(L_left, L_right, 1e-6)
分类规则树:
  if ratio < 0.12                       → Flat 平光（提示: 侧移光源/主体制造立体感）
  else if 鼻下阴影区亮度 < 面颊均亮 - τ  → Butterfly 或 Loop（按阴影宽度细分）
  else if 暗侧存在三角亮区(眼下三角采样) → Rembrandt
  else if ratio > 0.75                  → Split 分割光
综合诊断附加项: 过曝占比 / 欠曝占比 / 平均亮度带 / 光比 → 综合评分 + 建议
非人脸场景: 直方图 + Sobel 亮区质心 → 主光方向估计（顺/侧/逆/顶 四分类）
```
（阈值 τ 为可调参；先用规则树保证可解释与离线实时，后续可加轻量分类器。）

---

## 6. 模块 P6：拍前引导（四条引导器）

| 引导 | 输入 | 输出（方向+动作元组） | 触发条件 |
|---|---|---|---|
| 对位 | 主体框 vs 目标窗 | {左/右/近/远, 距离%} | 偏差 > 阈值 |
| 水平 | 陀螺仪旋转矩阵 | {顺/逆时针, 角度°} | 倾角 > 1.5° |
| 留白 | P2 结果 | {左/右, 需求量} | 前方空间不足 |
| 安全 | P1 ForbiddenBands vs 裁切线 | {后退/升高, 距离} | 禁区带即将触线 |

UI 渲染层消费元组渲染箭头/文案；所有引导可单独开关。

---

## 7. 与视觉模型的接线（阶段 2 产物）

```
FaceLandmarker(478点) ──→ P2 朝向 / P1 脸锚点 / P5 光位分区
PoseLandmarker(33点)  ──→ P1 关节禁区带 / 主体框
SelfieSegmentation    ──→ P4 RoD / BoundarySimplicity
三者任一失败 ──→ 降级: 纯几何模式（三分吸附 + 水平仪，无 AI 特征）
```

## 8. 验收标准（阶段 3 自测）

1. 关节安全：100 张人像测试集，裁切线穿关节率 = 0
2. 留白达标：朝向侧前方空间 ≥ 25% 的比例 ≥ 95%
3. 实时性：单帧全管线 ≤ 33ms（中端手机 wasm）
4. 可解释性：每次输出附五准则得分明细
