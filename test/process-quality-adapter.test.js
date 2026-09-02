const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const {
  PROCESS_FEATURES,
  createProcessQualityAdapter,
  validateFeatures
} = require("../algorithm/process-quality-adapter");

const sampleFeatures = Object.fromEntries(PROCESS_FEATURES.map((feature, index) => [feature, index + 1]));

test("validates all leakage-safe process features", () => {
  assert.deepEqual(validateFeatures(sampleFeatures), sampleFeatures);
  assert.throws(() => validateFeatures({ iron_feed_pct: 55.2 }), /invalid_process_features/);
  assert.throws(() => validateFeatures({ ...sampleFeatures, ore_pulp_ph: "not-a-number" }), /invalid_process_features/);
});

test("calls the process-quality HTTP service and exposes health", async () => {
  let captured;
  const service = http.createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ ok: true, modelId: "process-quality-random-forest-v1" }));
    }
    for await (const chunk of req) captured = (captured || "") + chunk;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      modelId: "process-quality-random-forest-v1",
      prediction: { target: "silica_concentrate_pct", value: 2.15, rounded: 2.15, unit: "%" },
      risk: { level: "low", label: "低风险", tone: "success" },
      inputRangeWarnings: [],
      globalFeatureImportance: [],
      summary: "测试预测",
      method: "test-service"
    }));
  });
  await new Promise((resolve) => service.listen(0, "127.0.0.1", resolve));
  try {
    const endpoint = "http://127.0.0.1:" + service.address().port;
    const adapter = createProcessQualityAdapter({ endpoint, timeoutMs: 1000 });
    const status = await adapter.status();
    const result = await adapter.predict(sampleFeatures);
    assert.equal(status.online, true);
    assert.equal(status.health.modelId, "process-quality-random-forest-v1");
    assert.deepEqual(JSON.parse(captured).features, sampleFeatures);
    assert.equal(result.prediction.value, 2.15);
  } finally {
    await new Promise((resolve, reject) => service.close((error) => error ? reject(error) : resolve()));
  }
});

test("reports disabled and unavailable process-model states", async () => {
  const disabled = createProcessQualityAdapter();
  assert.equal((await disabled.status()).endpointConfigured, false);
  await assert.rejects(() => disabled.predict(sampleFeatures), /process_model_not_configured/);

  const unavailable = createProcessQualityAdapter({ endpoint: "http://127.0.0.1:1", timeoutMs: 50 });
  assert.equal((await unavailable.status()).online, false);
  await assert.rejects(() => unavailable.predict(sampleFeatures), /process_model_unavailable/);
});
