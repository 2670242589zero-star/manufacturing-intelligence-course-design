const stages = [
  { id: "preprocess", name: "图像预处理", implementation: "Canvas metrics adapter", next: "defect-detection", status: "ready" },
  { id: "defect-detection", name: "缺陷检测模型", implementation: "Defect rules / YOLO-ready interface", next: "quality-analysis", status: "ready" },
  { id: "quality-analysis", name: "质量分析模型", implementation: "Quality scoring adapter", next: "decision", status: "ready" },
  { id: "decision", name: "质量决策", implementation: "Risk bands + contributor ranking", next: "persistence", status: "ready" },
  { id: "persistence", name: "数据库与 Dashboard", implementation: "JSON store + REST API + browser UI", next: null, status: "ready" }
];

function getPipeline() {
  return {
    name: "智能视觉质检平台",
    stages,
    modelPlan: {
      harness: "Codex + GitHub",
      model: "GPT-5.6sol",
      visionAdapter: "Canvas metrics / OpenCV-ready",
      defectAdapter: "YOLO-ready",
      analysisAdapter: "classification and risk scoring-ready"
    }
  };
}

module.exports = { getPipeline };
