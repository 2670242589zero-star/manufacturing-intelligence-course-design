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
test("forwards image data to the configured inference adapter", async () => {
  const before = await readInspections();
  let captured;
  const adapter = {
    analyze: async (...args) => {
      captured = args;
      return {
        qualityScore: 72,
        risk: { level: "medium", label: "中风险", tone: "warning" },
        detections: [{ type: "划痕", confidence: 0.9, area: 20 }],
        contributors: [],
        summary: "测试推理结果",
        method: "test-inference",
        analyzedAt: new Date().toISOString()
      };
    },
    status: () => ({ configuredMode: "remote" })
  };
  const injectedServer = createServer({ inferenceAdapter: adapter });
  await new Promise((resolve) => injectedServer.listen(0, resolve));
  try {
    const response = await fetch("http://127.0.0.1:" + injectedServer.address().port + "/api/inspect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        batchId: "IMAGE-FORWARD-TEST",
        line: "压延线 A",
        imageName: "sample.png",
        imageData: "data:image/png;base64,abc",
        imageMetrics: { brightness: 58 },
        process: { temperature: 68, pressure: 3.8, speed: 42 }
      })
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(captured[3], "data:image/png;base64,abc");
    assert.equal(body.method, "test-inference");
  } finally {
    await new Promise((resolve, reject) => injectedServer.close((error) => error ? reject(error) : resolve()));
    await writeInspections(before);
  }
});

test("rejects unsupported image data before inference", async () => {
  const before = await readInspections();
  let called = false;
  const adapter = {
    analyze: async () => {
      called = true;
      throw new Error("should_not_run");
    },
    status: () => ({ configuredMode: "remote" })
  };
  const injectedServer = createServer({ inferenceAdapter: adapter });
  await new Promise((resolve) => injectedServer.listen(0, resolve));
  try {
    const response = await fetch("http://127.0.0.1:" + injectedServer.address().port + "/api/inspect", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageData: "data:text/plain;base64,abc" })
    });
    const body = await response.json();
    assert.equal(response.status, 400);
    assert.equal(body.error, "invalid_image_data");
    assert.equal(called, false);
  } finally {
    await new Promise((resolve, reject) => injectedServer.close((error) => error ? reject(error) : resolve()));
    await writeInspections(before);
  }
});

test("exposes process-model status and forwards valid prediction features", async () => {
  const expectedFeatures = {
    iron_feed_pct: 55.2,
    silica_feed_pct: 16.98,
    starch_flow: 3019.53,
    amina_flow: 557.434,
    ore_pulp_flow: 395.713,
    ore_pulp_ph: 10.0664,
    ore_pulp_density: 1.74,
    flotation_air_flow_avg: 265.09,
    flotation_level_avg: 461.548
  };
  let captured;
  const processAdapter = {
    status: async () => ({ endpointConfigured: true, online: true, activeAdapter: "test-process-model" }),
    predict: async (features) => {
      captured = features;
      return {
        modelId: "process-quality-random-forest-v1",
        prediction: { target: "silica_concentrate_pct", value: 1.99, rounded: 1.99, unit: "%" },
        risk: { level: "low", label: "低风险", tone: "success" },
        inputRangeWarnings: [],
        globalFeatureImportance: [],
        summary: "测试预测",
        method: "test-process-model"
      };
    }
  };
  const injectedServer = createServer({ processQualityAdapter: processAdapter });
  await new Promise((resolve) => injectedServer.listen(0, resolve));
  try {
    const url = "http://127.0.0.1:" + injectedServer.address().port;
    const status = await (await fetch(url + "/api/process-quality/status")).json();
    const response = await fetch(url + "/api/process-quality/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ features: expectedFeatures })
    });
    const body = await response.json();
    const invalid = await fetch(url + "/api/process-quality/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ features: { iron_feed_pct: 55.2 } })
    });
    assert.equal(status.online, true);
    assert.equal(response.status, 200);
    assert.deepEqual(captured, expectedFeatures);
    assert.equal(body.prediction.rounded, 1.99);
    assert.equal(invalid.status, 400);
  } finally {
    await new Promise((resolve, reject) => injectedServer.close((error) => error ? reject(error) : resolve()));
  }
});

test("exposes knowledge search and evidence-fusion recommendation contracts", async () => {
  const knowledge = await (await fetch(baseUrl + "/api/knowledge?defectType=%E8%A1%A8%E9%9D%A2%E7%BA%B9%E7%90%86%E5%BC%82%E5%B8%B8&riskLevel=high")).json();
  assert.ok(knowledge.count > 0);
  assert.equal(knowledge.source, "knowledge/entries.json");

  const response = await fetch(baseUrl + "/api/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      context: { batchId: "DECISION-TEST", line: "压延线 A" },
      vision: { risk: { level: "high", label: "高风险" }, detections: [{ type: "表面纹理异常", confidence: 0.91, area: 40 }] },
      processQuality: { risk: { level: "medium", label: "中风险" }, prediction: { value: 2.4 }, inputRangeWarnings: [{ label: "矿浆 pH" }] }
    })
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.fusion.risk.level, "high");
  assert.equal(body.fusion.humanReviewRequired, true);
  assert.ok(body.recommendations.length > 0);
  assert.ok(body.recommendations[0].checks.length > 0);

  const invalid = await fetch(baseUrl + "/api/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: "x".repeat(201) })
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "invalid_recommendation_query");
});
