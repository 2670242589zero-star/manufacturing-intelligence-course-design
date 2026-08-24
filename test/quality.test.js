const test = require("node:test");
const assert = require("node:assert/strict");
const { analyzeVision, classifyRisk } = require("../algorithm/vision");

test("classifies quality risk bands", () => {
  assert.equal(classifyRisk(18).level, "low");
  assert.equal(classifyRisk(52).level, "medium");
  assert.equal(classifyRisk(78).level, "high");
});

test("detects a high-contrast image signal", () => {
  const result = analyzeVision({ brightness: 52, contrast: 70, edgeDensity: 0.34, sharpness: 82 }, { temperature: 68, pressure: 3.8, speed: 42 });
  assert.ok(result.detections.length >= 1);
  assert.equal(result.risk.level, "high");
  assert.ok(result.contributors[0].value > 0);
});

test("returns a clean result for stable process metrics", () => {
  const result = analyzeVision({ brightness: 58, contrast: 22, edgeDensity: 0.12, sharpness: 84 }, { temperature: 68, pressure: 3.8, speed: 42 });
  assert.equal(result.detections.length, 0);
  assert.equal(result.risk.level, "low");
  assert.ok(result.qualityScore >= 90);
});
