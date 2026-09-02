const test = require("node:test");
const assert = require("node:assert/strict");
const { createKnowledgeBase } = require("../algorithm/knowledge-base");
const { fuseEvidence } = require("../algorithm/evidence-fusion");
const { buildRecommendations } = require("../algorithm/recommendation");

const knowledgeBase = createKnowledgeBase();

test("searches knowledge entries by defect and risk", () => {
  const result = knowledgeBase.search({ defectTypes: ["表面纹理异常"], riskLevel: "high" });
  assert.ok(result.count > 0);
  assert.ok(result.matches.some((item) => item.id === "kb-surface-texture-anomaly"));
  assert.ok(result.matches.every((item) => item.matchReasons.length > 0));
});

test("fuses visual and process evidence while preserving disagreement", () => {
  const result = fuseEvidence({
    vision: { risk: { level: "high", label: "高风险" }, detections: [{ type: "划痕", confidence: 0.91, area: 42 }] },
    processQuality: { risk: { level: "low", label: "低风险" }, inputRangeWarnings: [{ label: "矿浆 pH" }] }
  });
  assert.equal(result.risk.level, "high");
  assert.equal(result.agreement, false);
  assert.deepEqual(result.activeSources, ["vision", "process"]);
  assert.equal(result.humanReviewRequired, true);
  assert.ok(result.reviewReasons.some((reason) => reason.includes("不完全一致")));
});

test("returns a safe low-risk fallback when no evidence is available", () => {
  const result = buildRecommendations({}, knowledgeBase);
  assert.equal(result.fusion.risk.level, "low");
  assert.equal(result.fusion.humanReviewRequired, true);
  assert.ok(result.recommendations.some((item) => item.id === "kb-low-risk-observation"));
});

test("creates auditable recommendations for a high-risk process signal", () => {
  const result = buildRecommendations({
    processQuality: { risk: { level: "high", label: "高风险" }, prediction: { value: 4.2 }, inputRangeWarnings: [{ label: "矿浆 pH" }] }
  }, knowledgeBase);
  assert.equal(result.fallback, false);
  assert.ok(result.recommendations.length >= 2);
  assert.ok(result.recommendations.every((item) => item.humanApprovalRequired));
  assert.ok(result.knowledge.matches.every((item) => item.source));
});
