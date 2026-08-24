const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function classifyRisk(score) {
  if (score >= 70) return { level: "high", label: "高风险", tone: "danger" };
  if (score >= 42) return { level: "medium", label: "中风险", tone: "warning" };
  return { level: "low", label: "低风险", tone: "success" };
}

function analyzeVision(imageMetrics = {}, process = {}) {
  const brightness = Number(imageMetrics.brightness ?? 58);
  const contrast = Number(imageMetrics.contrast ?? 28);
  const edgeDensity = Number(imageMetrics.edgeDensity ?? 0.18);
  const sharpness = Number(imageMetrics.sharpness ?? 72);
  const temperature = Number(process.temperature ?? 68);
  const pressure = Number(process.pressure ?? 3.8);
  const speed = Number(process.speed ?? 42);

  const detections = [];
  if (edgeDensity > 0.24 || contrast > 48) {
    detections.push({
      type: "表面纹理异常",
      confidence: clamp(0.72 + Math.min(edgeDensity, 0.35), 0.72, 0.98),
      area: Math.round(clamp(edgeDensity * 1000, 12, 260)),
      box: [16, 18, 128, 74]
    });
  }
  if (brightness < 35 || brightness > 82) {
    detections.push({
      type: brightness < 35 ? "曝光不足" : "曝光过度",
      confidence: 0.86,
      area: Math.round(clamp(Math.abs(brightness - 58) * 2.8, 8, 180)),
      box: [152, 44, 220, 116]
    });
  }
  if (sharpness < 46) {
    detections.push({
      type: "图像清晰度不足",
      confidence: 0.79,
      area: Math.round((46 - sharpness) * 2),
      box: [64, 130, 188, 184]
    });
  }

  const defectRisk = detections.reduce((sum, item) => sum + item.confidence * 72, 0);
  const processRisk =
    Math.abs(temperature - 68) * 0.55 +
    Math.abs(pressure - 3.8) * 6 +
    Math.abs(speed - 42) * 0.22;
  const qualityScore = Math.round(clamp(100 - defectRisk - processRisk, 12, 98));
  const risk = classifyRisk(100 - qualityScore);

  const contributors = [
    { name: "缺陷信号", value: Math.round(defectRisk), detail: detections.length ? "检测到可疑视觉区域" : "未发现明显缺陷" },
    { name: "温度偏差", value: Math.round(Math.abs(temperature - 68) * 1.2), detail: temperature.toFixed(1) + " °C" },
    { name: "压力偏差", value: Math.round(Math.abs(pressure - 3.8) * 8), detail: pressure.toFixed(1) + " MPa" },
    { name: "速度偏差", value: Math.round(Math.abs(speed - 42) * 0.5), detail: speed.toFixed(0) + " m/min" }
  ].sort((a, b) => b.value - a.value);

  return {
    qualityScore,
    risk,
    detections,
    contributors,
    summary: detections.length
      ? "视觉检测发现 " + detections.length + " 类可疑信号，建议质量工程师复核图像与工艺参数。"
      : "当前图像未发现明显缺陷信号，可继续关注工艺参数趋势。",
    method: "Canvas metrics adapter / YOLO-ready interface",
    analyzedAt: new Date().toISOString()
  };
}

module.exports = { analyzeVision, classifyRisk };
