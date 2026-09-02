const { fuseEvidence } = require("./evidence-fusion");

function buildSearchFilters(input, fusion) {
  const detections = (input.vision?.detections || []).map((item) => item.type).filter(Boolean);
  const processSignals = [];
  if (input.processQuality?.prediction) processSignals.push("工艺预测", "质量风险");
  if ((input.processQuality?.inputRangeWarnings || []).length) processSignals.push("输入范围告警", "分布外");
  if (!detections.length && fusion.risk.level === "low") processSignals.push("趋势观察");
  return { query: input.query || "", defectTypes: detections, processSignals, riskLevel: fusion.risk.level, limit: input.limit || 6 };
}

function priorityFor(entry, risk) {
  if (risk === "high" && entry.evidenceGrade === "B") return "immediate";
  if (risk === "high" || risk === "medium") return "review";
  return "observe";
}

function buildRecommendations(input = {}, knowledgeBase) {
  const fusion = fuseEvidence(input);
  const search = knowledgeBase.search(buildSearchFilters(input, fusion));
  const recommendations = search.matches.map((entry) => ({
    id: entry.id,
    title: entry.title,
    priority: priorityFor(entry, fusion.risk.level),
    rationale: entry.matchReasons.join("；") || "与当前风险等级和证据类型匹配",
    checks: entry.checks,
    actions: entry.actions,
    stopConditions: entry.stopConditions,
    evidenceGrade: entry.evidenceGrade,
    source: entry.source,
    scope: entry.scope,
    humanApprovalRequired: true
  }));
  return {
    decisionId: "DEC-" + Date.now().toString(36).toUpperCase(),
    generatedAt: new Date().toISOString(),
    fusion,
    knowledge: { query: search.query, count: search.count, matches: search.matches.map(({ searchText, ...entry }) => entry) },
    recommendations,
    fallback: !recommendations.length,
    fallbackMessage: recommendations.length ? null : "知识库暂无直接匹配条目，请由质量工程师依据现场规程人工判断。"
  };
}

module.exports = { buildRecommendations };
