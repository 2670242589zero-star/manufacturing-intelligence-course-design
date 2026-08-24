const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { createInferenceAdapter } = require("../algorithm/inference-adapter");

test("uses the explainable local adapter when no endpoint is configured", async () => {
  const adapter = createInferenceAdapter({ endpoint: "" });
  const result = await adapter.analyze({ brightness: 58, contrast: 20, edgeDensity: 0.1, sharpness: 80 }, { temperature: 68, pressure: 3.8, speed: 42 });
  assert.ok(result.qualityScore >= 90);
  assert.equal(adapter.status().configuredMode, "local");
  assert.equal(adapter.status().lastRequest.degraded, false);
});

test("calls a compatible OpenCV and YOLO HTTP service", async () => {
  const remote = http.createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const payload = JSON.parse(raw);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      qualityScore: 74,
      risk: { level: "medium", label: "中风险" },
      detections: [{ type: "划痕", confidence: 0.91, area: 44 }],
      contributors: [{ name: "缺陷信号", value: 26, detail: payload.context.batchId }],
      summary: "远程模型返回 1 个缺陷候选。",
      analyzedAt: new Date().toISOString()
    }));
  });
  await new Promise((resolve) => remote.listen(0, resolve));
  const adapter = createInferenceAdapter({ endpoint: "http://127.0.0.1:" + remote.address().port });
  const result = await adapter.analyze({}, {}, { batchId: "REMOTE-TEST" });
  assert.equal(result.method, "OpenCV + YOLO HTTP adapter");
  assert.equal(result.detections[0].type, "划痕");
  assert.equal(adapter.status().lastRequest.mode, "remote");
  await new Promise((resolve, reject) => remote.close((error) => error ? reject(error) : resolve()));
});

test("marks a remote failure as an explicit local fallback", async () => {
  const adapter = createInferenceAdapter({ endpoint: "http://127.0.0.1:1", timeoutMs: 100, fallbackEnabled: true });
  const result = await adapter.analyze({}, {});
  assert.match(result.method, /fallback/);
  assert.equal(adapter.status().lastRequest.degraded, true);
  assert.ok(adapter.status().lastError.message);
});
