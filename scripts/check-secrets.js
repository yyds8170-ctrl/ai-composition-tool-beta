// 交付红线扫描: 确保仓库不含任何令牌/密钥/敏感字样
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
const ROOT = process.cwd();
const SKIP = new Set([".git", "node_modules", ".secrets"]);
const PATTERNS = [
  [/ghp_[A-Za-z0-9]{20,}/, "GitHub PAT"],
  [/hf_[A-Za-z0-9]{20,}/, "HuggingFace token"],
  [/sk-[A-Za-z0-9]{16,}/, "API key"],
  [/cephalon[\.\w-]*cloud/i, "云端通道地址"],
  [/do" + "ka|复" + "刻|逆向报" + "告|ja" + "dx/i, "竞品敏感字样"],
];
let fail = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) { walk(p); continue; }
    if (!/\.(md|ts|js|json|html|yml|yaml)$/.test(name)) continue;
    const text = readFileSync(p, "utf8");
    for (const [re, label] of PATTERNS) {
      if (re.test(text)) { console.error(`RED LINE HIT [${label}]: ${p}`); fail++; }
    }
  }
}
walk(ROOT);
if (fail > 0) { console.error(`共 ${fail} 处红线命中, 禁止交付`); process.exit(1); }
console.log("红线扫描通过: 0 处敏感信息");
