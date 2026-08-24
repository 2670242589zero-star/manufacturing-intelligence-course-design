const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { analyzeVision } = require("./algorithm/vision");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "inspections.json");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg"
};

const seed = [
  {
    id: "INSP-240824-001",
    batchId: "B-20260824-01",
    line: "压延线 A",
    imageName: "steel-surface-001.jpg",
    qualityScore: 91,
    risk: { level: "low", label: "低风险", tone: "success" },
    detections: [],
    contributors: [{ name: "缺陷信号", value: 0, detail: "未发现明显缺陷" }],
    summary: "当前图像未发现明显缺陷信号，可继续关注工艺参数趋势。",
    analyzedAt: "2026-08-24T01:20:00.000Z"
  },
  {
    id: "INSP-240824-002",
    batchId: "B-20260824-02",
    line: "表面处理线 B",
    imageName: "steel-surface-002.jpg",
    qualityScore: 63,
    risk: { level: "medium", label: "中风险", tone: "warning" },
    detections: [{ type: "表面纹理异常", confidence: 0.88, area: 112 }],
    contributors: [{ name: "缺陷信号", value: 24, detail: "检测到可疑视觉区域" }],
    summary: "视觉检测发现 1 类可疑信号，建议质量工程师复核图像与工艺参数。",
    analyzedAt: "2026-08-24T02:48:00.000Z"
  }
];

async function ensureData() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try { await fsp.access(DATA_FILE); }
  catch { await fsp.writeFile(DATA_FILE, JSON.stringify(seed, null, 2)); }
}

async function readInspections() {
  await ensureData();
  return JSON.parse(await fsp.readFile(DATA_FILE, "utf8"));
}

async function writeInspections(items) {
  await fsp.writeFile(DATA_FILE, JSON.stringify(items.slice(0, 50), null, 2));
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}

async function bodyOf(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

async function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const safePath = path.normalize(urlPath).replace(/^([.][.][/\\])+/, "");
  const target = path.join(PUBLIC, safePath);
  if (!target.startsWith(PUBLIC)) return send(res, 403, { error: "forbidden" });
  try {
    const content = await fsp.readFile(target);
    send(res, 200, content, MIME[path.extname(target)] || "application/octet-stream");
  } catch {
    send(res, 404, { error: "not_found" });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      return send(res, 200, { ok: true, service: "vision-quality-api", time: new Date().toISOString() });
    }
    if (req.method === "GET" && req.url === "/api/inspections") {
      return send(res, 200, { items: await readInspections() });
    }
    if (req.method === "POST" && req.url === "/api/inspect") {
      const payload = await bodyOf(req);
      const result = analyzeVision(payload.imageMetrics, payload.process);
      const record = {
        id: "INSP-" + Date.now(),
        batchId: payload.batchId || "UNASSIGNED",
        line: payload.line || "未指定产线",
        imageName: payload.imageName || "browser-canvas",
        ...result
      };
      const items = await readInspections();
      await writeInspections([record, ...items]);
      return send(res, 201, record);
    }
    if (req.method === "GET") return serveStatic(req, res);
    return send(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    return send(res, 500, { error: "server_error", message: error.message });
  }
});

ensureData().then(() => server.listen(PORT, () => {
  console.log("Vision quality platform running at http://localhost:" + PORT);
}));
