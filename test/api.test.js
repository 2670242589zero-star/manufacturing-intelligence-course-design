const test = require("node:test");
const assert = require("node:assert/strict");
const { createServer, ensureData, readInspections, writeInspections } = require("../server");

let server;
let baseUrl;

test.before(async () => {
  await ensureData();
  server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = "http://127.0.0.1:" + server.address().port;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test("exposes the health and pipeline contracts", async () => {
  const health = await (await fetch(baseUrl + "/api/health")).json();
  const pipeline = await (await fetch(baseUrl + "/api/pipeline")).json();
  assert.equal(health.ok, true);
  assert.deepEqual(pipeline.stages.map((stage) => stage.id), ["preprocess", "defect-detection", "quality-analysis", "decision", "persistence"]);
  assert.equal(pipeline.modelPlan.harness, "Codex + GitHub");
});

test("returns dataset metadata and an aggregate summary", async () => {
  const dataset = await (await fetch(baseUrl + "/api/dataset")).json();
  const summary = await (await fetch(baseUrl + "/api/summary")).json();
  assert.equal(dataset.fields.find((field) => field.name === "temperature").unit, "°C");
  assert.ok(Number.isInteger(summary.count));
  assert.ok(summary.riskCounts);
});

test("persists a valid inspection and rejects invalid process values", async () => {
  const before = await readInspections();
  const response = await fetch(baseUrl + "/api/inspect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ batchId: "API-TEST", line: "压延线 A", imageMetrics: { brightness: 58, contrast: 22, edgeDensity: 0.1, sharpness: 84 }, process: { temperature: 68, pressure: 3.8, speed: 42 } })
  });
  const invalid = await fetch(baseUrl + "/api/inspect", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ process: { speed: "not-a-number" } })
  });
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.batchId, "API-TEST");
  assert.equal(invalid.status, 400);
  await writeInspections(before);
});
