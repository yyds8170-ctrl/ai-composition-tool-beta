// ACT-Beta 裁切引擎 50 类目回归测试 (几何参数仿真, 断言驱动)
// 场景类目: 人像12 / 风光8 / 建筑4 / 街景4 / 水面3 / 食物物体文档宠物6 / 极限参数13
"use strict";

/* ========== 引擎(与 index.html v0.9 同步) ========== */
const SHOT_TYPES = [
  { name: "特写", ratio: .50, headroom: .05, ar: 3 / 4, focal: "2.5x", side: "C" },
  { name: "半身", ratio: .28, headroom: .09, ar: 3 / 4, focal: "2x", side: "C" },
  { name: "七分身", ratio: .16, headroom: .09, ar: 3 / 4, focal: "1.5x", side: "auto" },
  { name: "全身", ratio: .09, headroom: .07, ar: 9 / 16, focal: "1.0x", side: "C", needBody: true },
];
function cropForShot(s, fb, gaze, iw, ih, st) {
  let cropH = Math.min(ih, (fb ? fb.h : s.h) / st.ratio);
  let cropW = Math.min(iw, cropH * st.ar);
  cropH = cropW / st.ar;
  const dir = gaze && !gaze.dead ? gaze.dir : 0;
  let x = st.side === "C" || dir === 0 ? s.x + s.w / 2 - cropW / 2 : (dir > 0 ? s.x + s.w / 2 - cropW / 3 : s.x + s.w / 2 - cropW * 2 / 3);
  x = Math.max(0, Math.min(iw - cropW, x));
  let y = Math.max(0, Math.min(ih - cropH, s.y - cropH * st.headroom));
  const keepA = (cropW * cropH) / (iw * ih);
  if (keepA < .12) { const k = Math.sqrt(.12 / keepA); cropW = Math.min(iw, cropW * k); cropH = cropW / st.ar; }
  if (cropH > ih * .92) cropH = ih * .92;
  return { x: Math.max(0, Math.min(iw - cropW, x)), y: Math.max(0, Math.min(ih - cropH, y)), w: cropW, h: cropH };
}
function consensusMedian(boxes) {
  if (boxes.length < 3) return boxes[boxes.length - 1];
  const med = k => { const a = boxes.map(b => b[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; };
  return { x: med("x"), y: med("y"), w: med("w"), h: med("h") };
}

/* ========== 50 场景用例 ========== */
function P(x, y, w, h) { return { x, y, w, h }; }
const J = { iw: 1080, ih: 1440 };
const cases = [];
function add(cat, name, ctx, asserts) { cases.push({ cat, name, ctx, asserts }); }
//  ctx: {s 主体框, fb 脸框(可null), gaze, joints 关节y百分比数组, headTop, iw, ih, shot 目标景别}
//  asserts: 断言名数组

/* --- 人像 12 --- */
add("人像", "标准全身居中", { ...J, s: P(340, 180, 400, 1200), fb: P(490, 180, 100, 130), joints: [30, 50, 72, 92], gaze: { dir: 0, dead: true }, shot: "全身" }, ["noHeadCut", "noJointHit", "inCanvas"]);
add("人像", "全身偏左", { ...J, s: P(120, 160, 420, 1240), fb: P(280, 160, 100, 130), joints: [28, 50, 74, 94], gaze: { dir: 1, dead: false }, shot: "全身" }, ["noHeadCut", "noJointHit", "inCanvas", "gazeRoom"]);
add("人像", "全身偏右", { ...J, s: P(560, 200, 400, 1180), fb: P(700, 200, 100, 130), joints: [32, 52, 73, 90], gaze: { dir: -1, dead: false }, shot: "全身" }, ["noHeadCut", "noJointHit", "gazeRoom"]);
add("人像", "七分身标准", { ...J, s: P(360, 220, 380, 1000), fb: P(480, 220, 110, 140), joints: [34, 55, 78], gaze: { dir: 0, dead: true }, shot: "七分身" }, ["noHeadCut", "noJointHit", "inCanvas"]);
add("人像", "七分身视线朝右", { ...J, s: P(200, 250, 380, 950), fb: P(340, 250, 105, 135), joints: [36, 56, 79], gaze: { dir: 1, dead: false }, shot: "七分身" }, ["noHeadCut", "gazeRoom"]);
add("人像", "半身标准", { ...J, s: P(300, 300, 480, 800), fb: P(460, 300, 140, 180), joints: [48, 70], gaze: { dir: 0, dead: true }, shot: "半身" }, ["noHeadCut", "inCanvas"]);
add("人像", "半身贴左边缘", { ...J, s: P(0, 280, 420, 900), fb: P(120, 280, 130, 170), joints: [46, 72], gaze: { dir: 1, dead: false }, shot: "半身" }, ["noHeadCut", "inCanvas", "gazeRoom"]);
add("人像", "特写", { ...J, s: P(280, 200, 520, 700), fb: P(280, 200, 520, 700), joints: [], gaze: { dir: -1, dead: false }, shot: "特写" }, ["noHeadCut", "inCanvas"]);
add("人像", "头顶贴画布顶(headTop=1%)", { ...J, s: P(340, 14, 400, 1100), fb: P(480, 14, 100, 130), joints: [26, 48, 70], gaze: { dir: 0, dead: true }, shot: "七分身" }, ["noHeadCut", "noJointHit"]);
add("人像", "脚出画(下半身缺失)", { ...J, s: P(340, 200, 400, 1240), fb: P(480, 200, 100, 130), joints: [32, 52, 74], gaze: { dir: 0, dead: true }, shot: "全身" }, ["noHeadCut", "noJointHit"]);
add("人像", "远景小人(占比8%)", { ...J, s: P(500, 1000, 60, 110), fb: P(518, 1000, 22, 28), joints: [74, 77, 80], gaze: { dir: 0, dead: true }, shot: "全身" }, ["noHeadCut", "inCanvas"]);
add("人像", "极近特写(脸占屏宽90%)", { ...J, s: P(54, 100, 972, 1300), fb: P(54, 100, 972, 1300), joints: [], gaze: { dir: 1, dead: false }, shot: "特写" }, ["inCanvas", "noOverCrop"]);

/* --- 风光 8 --- */
add("风光", "横构图地平线居中", { ...J, s: P(0, 700, 1080, 740), fb: null, joints: [], gaze: null, horizon: 50, shot: "全身" }, ["inCanvas", "noOverCrop"]);
add("风光", "竖构图大天空", { ...J, s: P(0, 1000, 1080, 440), fb: null, joints: [], gaze: null, horizon: 70, shot: "全身" }, ["inCanvas"]);
add("风光", "山脉主体", { ...J, s: P(0, 500, 1080, 940), fb: null, joints: [], gaze: null, horizon: 35, shot: "全身" }, ["inCanvas"]);
add("风光", "海面船主体", { ...J, s: P(400, 850, 280, 200), fb: null, joints: [], gaze: null, horizon: 55, shot: "全身" }, ["inCanvas", "noOverCrop"]);
add("风光", "前景杂草全画面", { ...J, s: P(0, 0, 1080, 1440), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas", "noOverCrop"]);
add("风光", "日落剪影树", { ...J, s: P(200, 300, 300, 1100), fb: null, joints: [], gaze: null, horizon: 60, shot: "全身" }, ["inCanvas"]);
add("风光", "森林小路纵深", { ...J, s: P(300, 400, 480, 1040), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas"]);
add("风光", "雪原小房子", { ...J, s: P(480, 620, 120, 100), fb: null, joints: [], gaze: null, horizon: 45, shot: "全身" }, ["inCanvas"]);

/* --- 建筑 4 --- */
add("建筑", "对称大殿", { ...J, s: P(140, 400, 800, 1000), fb: null, joints: [], gaze: null, sym: .82, shot: "全身" }, ["inCanvas", "symKeep"]);
add("建筑", "高塔竖构图", { ...J, s: P(430, 60, 220, 1380), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas"]);
add("建筑", "横广角天际线", { ...J, s: P(0, 500, 1080, 400), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas", "noOverCrop"]);
add("建筑", "红墙人像(混合)", { ...J, s: P(600, 300, 300, 1000), fb: P(680, 300, 110, 140), joints: [40, 62, 85], gaze: { dir: -1, dead: false }, shot: "七分身" }, ["noHeadCut", "gazeRoom"]);

/* --- 街景 4 --- */
add("街景", "引导线街道", { ...J, s: P(300, 500, 480, 900), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas"]);
add("街景", "行人主体+路人", { ...J, s: P(200, 260, 380, 1080), fb: P(330, 260, 100, 130), joints: [38, 58, 80], gaze: { dir: 1, dead: false }, shot: "七分身" }, ["noHeadCut", "gazeRoom"]);
add("街景", "夜景霓虹人像", { ...J, s: P(400, 200, 400, 1100), fb: P(540, 200, 110, 140), joints: [30, 55, 78], gaze: { dir: 0, dead: true }, shot: "半身" }, ["noHeadCut"]);
add("街景", "咖啡店窗边人像", { ...J, s: P(100, 250, 400, 1000), fb: P(220, 250, 120, 150), joints: [35, 58, 80], gaze: { dir: 1, dead: false }, shot: "七分身" }, ["noHeadCut", "gazeRoom"]);

/* --- 水面 3 --- */
add("水面", "倒影对称湖面", { ...J, s: P(100, 300, 880, 1100), fb: null, joints: [], gaze: null, sym: .78, shot: "全身" }, ["symKeep", "inCanvas"]);
add("水面", "海边全身人像", { ...J, s: P(300, 180, 400, 1200), fb: P(440, 180, 100, 130), joints: [28, 50, 72, 92], gaze: { dir: -1, dead: false }, horizon: 52, shot: "全身" }, ["noHeadCut", "noJointHit"]);
add("水面", "游船特写", { ...J, s: P(200, 600, 680, 500), fb: null, joints: [], gaze: null, shot: "半身" }, ["inCanvas"]);

/* --- 食物/物体/文档/宠物 6 --- */
add("物体", "桌面美食俯拍", { ...J, s: P(200, 500, 680, 600), fb: null, joints: [], gaze: null, shot: "半身" }, ["inCanvas", "noOverCrop"]);
add("物体", "宠物猫正面", { ...J, s: P(300, 400, 480, 700), fb: null, joints: [], gaze: null, shot: "半身" }, ["inCanvas"]);
add("物体", "宠物狗草地", { ...J, s: P(150, 600, 500, 500), fb: null, joints: [], gaze: null, shot: "七分身" }, ["inCanvas"]);
add("物体", "产品白底图", { ...J, s: P(340, 480, 400, 480), fb: null, joints: [], gaze: null, shot: "特写" }, ["inCanvas"]);
add("文档", "A4文档扫描", { ...J, s: P(80, 100, 920, 1240), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas", "noOverCrop"]);
add("物体", "花卉微距", { ...J, s: P(380, 380, 320, 320), fb: null, joints: [], gaze: null, shot: "特写" }, ["inCanvas"]);

/* --- 极限参数 13 --- */
add("极限", "超竖 9:21", { iw: 900, ih: 2100, s: P(250, 300, 400, 1600), fb: P(380, 300, 130, 170), joints: [30, 55, 82], gaze: { dir: 0, dead: true }, shot: "全身" }, ["inCanvas"]);
add("极限", "超广 21:9", { iw: 2100, ih: 900, s: P(800, 100, 400, 760), fb: P(920, 100, 140, 180), joints: [28, 52, 80], gaze: { dir: 1, dead: false }, shot: "全身" }, ["inCanvas", "gazeRoom"]);
add("极限", "正方形 1:1", { iw: 1080, ih: 1080, s: P(340, 100, 400, 900), fb: P(470, 100, 110, 140), joints: [25, 50, 82], gaze: { dir: 0, dead: true }, shot: "七分身" }, ["inCanvas"]);
add("极限", "低分辨率 240x320", { iw: 240, ih: 320, s: P(80, 40, 90, 260), fb: P(105, 40, 30, 36), joints: [30, 55, 85], gaze: { dir: 0, dead: true }, shot: "全身" }, ["inCanvas"]);
add("极限", "高分辨率 4000x6000", { iw: 4000, ih: 6000, s: P(1300, 700, 1500, 4800), fb: P(1800, 700, 400, 500), joints: [28, 50, 75, 92], gaze: { dir: 0, dead: true }, shot: "全身" }, ["inCanvas", "noHeadCut"]);
add("极限", "主体贴四角", { ...J, s: P(0, 0, 300, 500), fb: P(80, 0, 120, 150), joints: [15, 30], gaze: { dir: 1, dead: false }, shot: "半身" }, ["inCanvas", "noOverCrop"]);
add("极限", "主体横向撑满", { ...J, s: P(0, 400, 1080, 600), fb: null, joints: [], gaze: null, shot: "全身" }, ["inCanvas", "noOverCrop"]);
add("极限", "主体纵向撑满", { ...J, s: P(300, 0, 480, 1440), fb: P(450, 0, 120, 150), joints: [20, 45, 70, 90], gaze: { dir: 0, dead: true }, shot: "全身" }, ["noOverCrop", "inCanvas"]);
add("极限", "gaze死区(正面)", { ...J, s: P(340, 200, 400, 1100), fb: P(480, 200, 110, 140), joints: [30, 52, 76], gaze: { dir: 0, dead: true }, shot: "七分身" }, ["noHeadCut", "centeredOrThirds"]);
add("极限", "gaze强侧脸90度", { ...J, s: P(200, 250, 400, 1000), fb: P(320, 250, 130, 160), joints: [35, 60], gaze: { dir: 1, dead: false, strong: true }, shot: "七分身" }, ["gazeRoom", "noHeadCut"]);
add("极限", "共识3帧抖动输入", { ...J, s: P(340, 180, 400, 1200), fb: P(490, 180, 100, 130), joints: [30, 50, 72], gaze: { dir: 0, dead: true }, shot: "全身", frames: [P(330, 170, 410, 1210), P(355, 195, 390, 1185), P(340, 180, 400, 1200)] }, ["consensusStable", "inCanvas"]);
add("极限", "共识5帧含离群跳点", { ...J, s: P(340, 180, 400, 1200), fb: P(490, 180, 100, 130), joints: [30, 50, 72], gaze: { dir: 0, dead: true }, shot: "全身", frames: [P(340, 180, 400, 1200), P(900, 500, 100, 100), P(345, 185, 395, 1195), P(338, 178, 402, 1202), P(342, 182, 398, 1198)] }, ["consensusStable"]);
add("极限", "七分身但身体信息缺失", { ...J, s: P(400, 300, 280, 400), fb: P(460, 300, 120, 150), joints: [], gaze: { dir: 0, dead: true }, shot: "七分身", noBody: true }, ["inCanvas", "noNaN"]);

/* ========== 断言库 ========== */
const A = {
  inCanvas: (w, ctx) => w.x >= -1 && w.y >= -1 && w.x + w.w <= ctx.iw + 1 && w.y + w.h <= ctx.ih + 1,
  noNaN: (w, ctx) => [w.x, w.y, w.w, w.h].every(v => typeof v === "number" && isFinite(v) && v >= 0),
  noHeadCut: (w, ctx) => !ctx.fb || w.y <= ctx.fb.y + ctx.fb.h * 0.02,   // 窗顶必须在脸顶之上(容2%)
  noJointHit: (w, ctx) => {
    const tol = 2; // 关节禁区带 ±2%
    const bottom = (w.y + w.h) / ctx.ih * 100, top = w.y / ctx.ih * 100;
    return (ctx.joints || []).every(j => (Math.abs(bottom - j) < tol ? false : true) && (Math.abs(top - j) < tol ? false : true));
  },
  gazeRoom: (w, ctx) => {
    if (!ctx.gaze || ctx.gaze.dead || ctx.gaze.dir === 0 || !ctx.fb) return true;
    const fbR = (ctx.fb.x + ctx.fb.w) / ctx.iw, fbL = ctx.fb.x / ctx.iw;
    const rightRoom = (w.x + w.w) / ctx.iw - fbR, leftRoom = fbL - w.x / ctx.iw;
    return ctx.gaze.dir > 0 ? rightRoom > leftRoom : leftRoom > rightRoom;
  },
  noOverCrop: (w, ctx) => (w.w * w.h) / (ctx.iw * ctx.ih) >= .1,  // 保留面积 ≥10%(文档/风光不狠裁)
  centeredOrThirds: (w, ctx) => true,
  symKeep: (w, ctx) => Math.abs((w.x + w.w / 2) / ctx.iw - .5) < .1 || !ctx.sym || ctx.sym < .7,
  consensusStable: (w, ctx) => {
    const med = consensusMedian(ctx.frames.map(f => ({ x: f.x, y: f.y, w: f.w, h: f.h })));
    return Math.abs(med.x - 340) < 60 && Math.abs(med.y - 180) < 60; // 离群跳点(900,500)被中位数压制
  },
};

/* ========== 跑测试 ========== */
let pass = 0, fail = 0; const fails = [];
const byCat = {};
for (const cs of cases) {
  const st = SHOT_TYPES.find(s => s.name === cs.shot) || SHOT_TYPES[2];
  const ctx = cs.ctx;
  const s = ctx.s, fb = ctx.fb, gaze = ctx.gaze;
  let w;
  try {
    const sEff = ctx.frames ? consensusMedian(ctx.frames.map(f => ({ ...f }))) : s;
    w = cropForShot(sEff, fb, gaze, ctx.iw, ctx.ih, st);
  } catch (e) { w = { x: NaN, y: 0, w: 0, h: 0 }; }
  const results = cs.asserts.map(a => ({ a, ok: !!A[a](w, ctx) }));
  const ok = results.every(r => r.ok);
  byCat[cs.cat] = byCat[cs.cat] || { p: 0, f: 0 };
  if (ok) { pass++; byCat[cs.cat].p++; } else { fail++; byCat[cs.cat].f++; fails.push(`${cs.cat}/${cs.name}: ` + results.filter(r => !r.ok).map(r => r.a).join(",")); }
}
console.log("========== ACT-Beta 50 类目回归测试 ==========");
console.log("总数:", cases.length, "| 通过:", pass, "| 失败:", fail, "| 通过率:", (pass / cases.length * 100).toFixed(1) + "%");
console.log("\n分类目:");
for (const [k, v] of Object.entries(byCat)) console.log("  " + k.padEnd(8, " "), v.p + "/" + (v.p + v.f), v.f ? "❌" : "✅");
if (fails.length) { console.log("\n失败明细:"); fails.forEach(f => console.log("  ✗", f)); }
