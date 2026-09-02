const LEVEL_SCORE = { low: 0.2, medium: 0.55, high: 0.85 };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function normalizeRisk(risk) {
  const level = String(risk?.level || "low").toLowerCase();
  return LEVEL_SCORE[level] === undefined ? "low" : level;
}

function fuseEvidence(input = {}) {
  const vision = input.vision || {};
  const processQuality = input.processQuality || {};
  const evidence = [];

  for (const detection of Array.isArray(vision.detections) ? vision.detections.slice(0, 20) : []) {
    const confidence = clamp(Number(detection.confidence) || 0, 0, 1);
    evidence.push({
      id: "vision-" + evidence.length,
      source: "vision",
      label: String(detection.type || "未命名视觉信号"),
      value: confidence,
      weight: 0.45,
      strength: confidence >= 0.8 ? "strong" : confidence >= 0.6 ? "moderate" : "weak",
      detail: "视觉检测候选，面积 " + Number(detection.area || 0) + " px²；需人工复核"
    });
  }
  if (vision.risk) {
    const level = normalizeRisk(vision.risk);
    evidence.push({ id: "vision-risk", source: "vision", label: "视觉风险等级", value: LEVEL_SCORE[level], weight: 0.3, strength: level === "high" ? "strong" : "moderate", detail: vision.risk.label || level });
  }

  if (processQuality.risk) {
    const level = normalizeRisk(processQuality.risk);
    const prediction = processQuality.prediction?.value;
    evidence.push({ id: "process-risk", source: "process", label: "工艺预测风险", value: LEVEL_SCORE[level], weight: 0.35, strength: level === "high" ? "strong" : "moderate", detail: Number.isFinite(Number(prediction)) ? "预测值 " + Number(prediction).toFixed(3) + "%" : (processQuality.risk.label || level) });
  }
  const warnings = Array.isArray(processQuality.inputRangeWarnings) ? processQuality.inputRangeWarnings.slice(0, 20) : [];
  for (const warning of warnings) {
    evidence.push({ id: "range-" + evidence.length, source: "process", label: String(warning.label || warning.feature || "输入范围告警"), value: 0.78, weight: 0.3, strength: "moderate", detail: "输入超出训练数据范围，仅提示分布外风险" });
  }

  const history = Array.isArray(input.history) ? input.history.slice(0, 10) : [];
  const historicalRisk = history.map((item) => normalizeRisk(item.risk)).filter((level) => level !== "low");
  if (historicalRisk.length) evidence.push({ id: "history-risk", source: "history", label: "近期历史风险", value: Math.max(...historicalRisk.map((level) => LEVEL_SCORE[level])), weight: 0.2, strength: "weak", detail: "历史记录中有 " + historicalRisk.length + " 条中风险及以上记录" });

  const totalWeight = evidence.reduce((sum, item) => sum + item.weight, 0);
  const fusedScore = totalWeight ? evidence.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight : 0.2;
  const activeSources = [...new Set(evidence.map((item) => item.source))];
  const sourceLevels = [vision.risk?.level, processQuality.risk?.level].map((level) => String(level || "").toLowerCase()).filter(Boolean);
  const agreement = sourceLevels.length >= 2 && sourceLevels.every((level) => level === sourceLevels[0] && level !== "low");
  const level = fusedScore >= 0.67 ? "high" : fusedScore >= 0.4 ? "medium" : "low";
  const confidence = clamp(0.32 + Math.min(evidence.length, 5) * 0.09 + (activeSources.length > 1 ? 0.08 : 0) + (agreement ? 0.08 : 0), 0.32, 0.9);
  const reviewReasons = [];
  if (!evidence.length) reviewReasons.push("当前没有可用视觉、工艺或历史证据");
  if (evidence.some((item) => item.source === "vision") && evidence.some((item) => item.source === "process") && !agreement) reviewReasons.push("视觉与工艺风险等级不完全一致");
  if (warnings.length) reviewReasons.push("存在超出训练数据范围的工艺输入");
  if (level !== "low") reviewReasons.push("综合风险达到中风险及以上，需要授权人员复核");

  return {
    risk: { level, label: level === "high" ? "高风险" : level === "medium" ? "中风险" : "低风险", tone: level === "high" ? "danger" : level === "medium" ? "warning" : "success" },
    fusedScore: Number(fusedScore.toFixed(4)),
    confidence: Number(confidence.toFixed(4)),
    evidence,
    activeSources,
    agreement,
    humanReviewRequired: level !== "low" || !evidence.length || reviewReasons.length > 0,
    reviewReasons,
    limitations: ["证据融合表示候选关联，不自动确定根因。", "公开数据模型的测试表现不能替代现场验证。"]
  };
}

module.exports = { fuseEvidence };
