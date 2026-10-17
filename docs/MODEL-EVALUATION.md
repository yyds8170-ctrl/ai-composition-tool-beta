# 开源视觉模型选型评估（阶段 2 交付）

> 目标：为「移动端 Web AI 实时构图」选定**人像检测/关键点、人像分割、姿态估计**三类能力的开源模型。
> 评估维度：①授权兼容性 ②浏览器端可运行性（WebAssembly/WebGPU）③体积与首载速度 ④精度 ⑤社区活跃度。
> 推理运行时基线：onnxruntime-web（wasm+webgpu）/ MediaPipe Tasks（wasm）。**排除云端推理作为基础链路**（离线可用为硬需求），云端仅作增强。

---

## 一、候选模型矩阵

### 人脸检测 / 关键点（视线留白、人像保护裁切的输入源）

| 候选 | 授权 | 体积 | Web 运行 | 关键点数 | 评估 |
|---|---|---|---|---|---|
| **MediaPipe Face Landmarker** | Apache-2.0 | ~3-5MB(wasm+model) | ✅ 官方 Tasks wasm | 478 点（含虹膜） | ⭐ 首选：点数最全、官方 wasm、视线方向可由虹膜+眼角推断 |
| MediaPipe BlazeFace short-range | Apache-2.0 | ~0.3MB | ✅ | 6 点 | 轻量但点数不足，留白方向判定吃力 |
| **RTMPose-t (face68)** | Apache-2.0 | ~5MB onnx | ✅ onnxruntime-web | 68 点 | 精度高，备选 |
| YOLOv8n-face | **AGPL-3.0** | ~6MB | ✅(转onnx) | 5 点 | ⚠️ 授权传染风险（AGPL），权重商用争议，**排除** |
| RetinaFace (insightface) | MIT(代码)/非商用权重 | — | 需转onnx | 5 点 | ⚠️ 权重许可混杂，排除 |

### 人像分割（背景保护 RoD、主体蒙版）

| 候选 | 授权 | 体积 | Web 运行 | 评估 |
|---|---|---|---|---|
| **MediaPipe Selfie Segmentation (landscape)** | Apache-2.0 | ~1MB | ✅ | ⭐ 首选：专为移动前置/自拍优化，实时 |
| MediaPipe Selfie Multiclass (46类) | Apache-2.0 | ~16MB | ✅ | 需要发丝/衣物细分类时升级用 |
| **MODNet (onnx)** | Apache-2.0 | ~25MB | ✅ onnxruntime-web | 精细 matting（发丝级），备选——高质量 RoD 用 |
| U2-Net (onnx) | Apache-2.0(代码) | ~170MB(全)/4.7MB( lite) | ✅ lite 版 | lite 可作备选 |
| RMBG-1.4 (BRIA) | **bria-rmbg-1.4 非商用** | — | — | ⚠️ 非商用授权，**排除** |

### 姿态估计（手脚/关节保护，防切关节）

| 候选 | 授权 | 体积 | Web 运行 | 关节 | 评估 |
|---|---|---|---|---|---|
| **MediaPipe Pose Landmarker (BlazePose)** | Apache-2.0 | ~5-9MB | ✅ | 33 点（含手脚指尖） | ⭐ 首选：33 关节覆盖防切需求 |
| **RTMPose-t wholebody** | Apache-2.0 | ~9MB onnx | ✅ | 133 全身 | 精度备选（onnxruntime-web） |
| MoveNet (tfjs) | Apache-2.0 | ~9MB | ✅ | 17 点 | 点数偏少 |
| OpenPose | **非商用许可** | — | — | — | ⚠️ **排除** |

---

## 二、选型结论（三模型组合）

| 能力 | 选定 | 运行时 | 预估首载 |
|---|---|---|---|
| 人脸 478 点（视线/留白/裁切锚点） | **MediaPipe Face Landmarker** | MediaPipe Tasks wasm | ~3s（可缓存） |
| 人像分割（RoD 蒙版） | **MediaPipe Selfie Segmentation** | 同上 | ~1s |
| 姿态 33 关节（防切关节） | **MediaPipe Pose Landmarker** | 同上 | ~2s |
| 精细 matting（可选升级） | MODNet onnx | onnxruntime-web webgpu | 按需加载 |

**共同优势**：全部 Apache-2.0（与本仓 MIT 兼容）；同属 MediaPipe Tasks 生态（wasm 加载器共享，三模型共享运行时）；Google 官方维护、移动端实时帧率验证充分。

**授权风险清单**：❌ AGPL（YOLOv8-face）— 传染义务；❌ RMBG-1.4 / OpenPose — 非商用限制；✅ 其余候选 Apache-2.0。

## 三、HuggingFace 部署清单（✅ 已部署 2026-10-16）

| 仓库 | 内容 | 状态 |
|---|---|---|
| [`jkyy/actb-face-landmarker`](https://huggingface.co/jkyy/actb-face-landmarker) | face_landmarker.task（478点 float16）+ model card | ✅ 公开可下载 |
| [`jkyy/actb-selfie-seg`](https://huggingface.co/jkyy/actb-selfie-seg) | selfie_segmenter.tflite（landscape float16）+ model card | ✅ 公开可下载 |
| [`jkyy/actb-pose-landmarker`](https://huggingface.co/jkyy/actb-pose-landmarker) | pose_landmarker_lite.task（33点 float16）+ model card | ✅ 公开可下载 |

- 全部标注 Apache-2.0 与原始来源（Google MediaPipe 官方发布转存）
- 匿名 resolve URL 验证通过（HTTP 200）
- 下载策略：HF resolve 主源 + jsDelivr 备源 + IndexedDB 缓存

## 四、本地推理封装设计（阶段 2 收口物）

```
src/core/vision/
├── detector.ts        # MediaPipe Tasks 封装：detectForVideo / detect
├── segmenter.ts       # 蒙版输出 → RoD 用 BitMap 蒙版
├── pose.ts            # 33 关节 → 裁切保护多边形
├── loader.ts          # 双源模型加载（HF/jsDelivr）+ IndexedDB 缓存
└── types.ts
```
- 接口统一：`init(modelSources) / detect(frame) / dispose()`
- 全部失败降级：模型加载失败 → 纯几何构图模式（三分法/水平仪，无 AI）——离线兜底链路

## 五、灰度与回滚

- 模型版本号化（HF revision tag），应用端 `config` 可切换模型版本
- 检测失败率超阈值自动回退传统 CV 模式（下次启动重试）

---

*评估人：ACTB 编排 · 2026-10-16 · 后续模型升级记录将追加于此*
