const http = require("node:http");
const path = require("node:path");
const fsp = require("node:fs/promises");
const { getPipeline } = require("./algorithm/pipeline");
const { createInferenceAdapter } = require("./algorithm/inference-adapter");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "inspections.json");
const SOURCES_FILE = path.join(DATA_DIR, "dataset-sources.json");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg"
};

const dataset = {
  name: "制造过程质量样例数据",
  source: "课程设计可复现样例，字段参考公开制造质量数据集",
  license: "课程演示数据，不包含企业敏感信息",
  path: "data/sample-process-data.csv",
  fields: [
    { name: "batch_id", type: "string", description: "生产批次编号" },
    { name: "line", type: "string", description: "生产线" },
    { name: "temperature", type: "number", unit: "°C", description: "过程温度" },
    { name: "pressure", type: "number", unit: "MPa", description: "过程压力" },
    { name: "speed", type: "number", unit: "m/min", description: "生产速度" },
    { name: "quality_label", type: "0/1", description: "质量标签，1 表示异常" }
  ],
  processing: ["去除空批次", "数值字段类型转换", "按工艺范围检查异常值", "保留批次与产线追溯关系"]
};

const seed = [
  { id: "INSP-240824-001", batchId: "B-20260824-01", line: "压延线 A", imageName: "steel-surface-001.jpg", qualityScore: 91, risk: { level: "low", label: "低风险", tone: "success" }, detections: [], contributors: [{ name: "缺陷信号", value: 0, detail: "未发现明显缺陷" }], summary: "当前图像未发现明显缺陷信号，可继续关注工艺参数趋势。", analyzedAt: "2026-08-24T01:20:00.000Z" },
  { id: "INSP-240824-002", batchId: "B-20260824-02", line: "表面处理线 B", imageName: "steel-surface-002.jpg", qualityScore: 63, risk: { level: "medium", label: "中风险", tone: "warning" }, detections: [{ type: "表面纹理异常", confidence: 0.88, area: 112 }], contributors: [{ name: "缺陷信号", value: 24, detail: "检测到可疑视觉区域" }], summary: "视觉检测发现 1 类可疑信号，建议质量工程师复核图像与工艺参数。", analyzedAt: "2026-08-24T02:48:00.000Z" }
];

async function ensureData() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try { await fsp.access(DATA_FILE); } catch { await fsp.writeFile(DATA_FILE, JSON.stringify(seed, null, 2)); }
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
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw new Error("request_too_large");
  }
  return raw ? JSON.parse(raw) : {};
}

function validateInspection(payload) {
  if (!payload || typeof payload !== "object") throw new Error("invalid_payload");
  if (payload.batchId && String(payload.batchId).length > 80) throw new Error("invalid_batch_id");
  for (const key of ["temperature", "pressure", "speed"]) {
    if (payload.process?.[key] !== undefined && !Number.isFinite(Number(payload.process[key]))) throw new Error("invalid_process_value");
  }
}

async function serveStatic(req, res) {
  const urlPath = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const target = path.resolve(PUBLIC, "." + urlPath);
  const relative = path.relative(PUBLIC, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return send(res, 403, { error: "forbidden" });
  try {
    const content = await fsp.readFile(target);
    send(res, 200, content, MIME[path.extname(target)] || "application/octet-stream");
  } catch { send(res, 404, { error: "not_found" }); }
}

function createServer(options = {}) {
  const inference = options.inferenceAdapter || createInferenceAdapter(options.inferenceOptions);
  return http.createServer(async (req, res) => {
    try {
      if (req.method === "GET" && req.url === "/api/health") return send(res, 200, { ok: true, service: "vision-quality-api", time: new Date().toISOString() });
      if (req.method === "GET" && req.url === "/api/pipeline") return send(res, 200, getPipeline());
      if (req.method === "GET" && req.url === "/api/model-status") return send(res, 200, inference.status());
      if (req.method === "GET" && req.url === "/api/dataset") return send(res, 200, dataset);
      if (req.method === "GET" && req.url === "/api/dataset-sources") return send(res, 200, JSON.parse(await fsp.readFile(SOURCES_FILE, "utf8")));
      if (req.method === "GET" && req.url === "/api/inspections") return send(res, 200, { items: await readInspections() });
      if (req.method === "GET" && req.url === "/api/summary") {
        const items = await readInspections();
        const riskCounts = items.reduce((counts, item) => { const level = item.risk?.level || "unknown"; counts[level] = (counts[level] || 0) + 1; return counts; }, {});
        const contributors = items.flatMap((item) => item.contributors || []).reduce((result, item) => { result[item.name] = (result[item.name] || 0) + Number(item.value || 0); return result; }, {});
        return send(res, 200, { count: items.length, averageScore: items.length ? Math.round(items.reduce((sum, item) => sum + item.qualityScore, 0) / items.length) : 0, riskCounts, topContributor: Object.entries(contributors).sort((a, b) => b[1] - a[1])[0]?.[0] || null });
      }
      if (req.method === "POST" && req.url === "/api/inspect") {
        const payload = await bodyOf(req);
        validateInspection(payload);
        const result = await inference.analyze(payload.imageMetrics, payload.process, { batchId: payload.batchId, line: payload.line, imageName: payload.imageName });
        const record = { id: "INSP-" + Date.now(), batchId: payload.batchId || "UNASSIGNED", line: payload.line || "未指定产线", imageName: payload.imageName || "browser-canvas", ...result };
        const items = await readInspections();
        await writeInspections([record, ...items]);
        return send(res, 201, record);
      }
      if (req.method === "GET") return serveStatic(req, res);
      return send(res, 405, { error: "method_not_allowed" });
    } catch (error) {
      const status = error.message.startsWith("invalid_") || error.message === "request_too_large" ? 400 : 500;
      return send(res, status, { error: status === 400 ? error.message : "server_error", message: error.message });
    }
  });
}

if (require.main === module) ensureData().then(() => createServer().listen(PORT, () => console.log("Vision quality platform running at http://localhost:" + PORT)));

module.exports = { createServer, ensureData, readInspections, writeInspections };
