# AI Composition Tool Beta

<div align="center">

**移动端 AI 实时构图工具 · 原创开源实现**

🚀 [在线使用（推荐）](https://yyds8170-ctrl.github.io/ai-composition-tool-beta/) · 📲 [安装为 App](#-安装为-app) · 💻 [本地运行](#-本地运行) · 🤗 [模型资产](https://huggingface.co/jkyy)

</div>

---

## 🚀 快速开始

**在线使用（推荐）**：用手机浏览器打开 <https://yyds8170-ctrl.github.io/ai-composition-tool-beta/>

**安装为 App**：打开后 → 浏览器菜单 → 「添加到主屏幕」→ 全屏 App 形态使用

**本地运行**：下载 Release 中的单文件页面（或 `public/index.html`），浏览器打开即可；相机与模型加载需 HTTPS（GitHub Pages 已满足）。**本工具永久免费、不限使用次数**，全部推理在本机浏览器完成，图像不上传服务器。

## ✨ 功能矩阵

| 能力 | 说明 | 状态 |
|---|---|---|
| 智能人像裁切 | 关节禁区 + 节段安全带，防切头/手脚/关节 | ✅ |
| 宽幅横拍 16:9 | 横幅构图建议与裁切 | 🚧 |
| 视线留白 | 朝向向量估算 + 前方空间量化 | ✅ |
| 边缘吸附 | 三分/黄金双网格吸附 | ✅ |
| 背景保护 RoD | 分割蒙版主体完整性约束 | ✅ |
| 拍前引导 | 对位/水平/留白/安全四条引导 | 🚧 |
| 光位诊断 | 五类光位规则树 + 曝光诊断 | ✅ |
| 滤镜推荐 | 场景化自动推荐 | 🚧 |
| 可训练偏好 | 用户偏好学习 | 🚧 |
| 离线可用 | Service Worker + 模型缓存 | ✅ |
| 永久免费 | 不限次数 | ✅ |

## 🏗️ 架构

```
public/index.html      单文件体验版（MediaPipe wasm 本机推理）
src/core/*.ts          构图算法库（TypeScript, P1-P6 模块）
docs/                  知识库 / 算法规格 / 模型评估 / 计划 / 矩阵
scripts/               交付红线扫描等工具
```

- 本地推理：MediaPipe Face Landmarker / Selfie Segmentation / Pose Landmarker（Apache-2.0，[HuggingFace 托管](https://huggingface.co/jkyy)）
- 云端增强：自建调用链路（规划中，双链路可切换）
- 离线：Service Worker 预缓存应用壳 + 模型资产一次下载永久缓存

## 📚 文档

[开发计划](docs/PLAN.md) · [功能矩阵](docs/FUNCTION-MATRIX.md) · [模型选型](docs/MODEL-EVALUATION.md) · [摄影构图知识库](docs/PHOTOGRAPHY-KB.md) · [算法规格](docs/COMPOSITION-SPEC.md)

## 🛡️ 合规

全部功能基于公开摄影理论与开源模型原创实现；交付前执行敏感信息与文案红线扫描（`scripts/check-secrets.js`）。

## License

MIT
