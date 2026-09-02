const state = { inspections: [], latest: null, latestProcess: null, imageMetrics: null, imageName: "", imageData: "", imageDataPromise: Promise.resolve("") };
const $ = (selector) => document.querySelector(selector);
const formatTime = (value) => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

function setStatus(message, type = "") {
  const node = $("#formStatus");
  node.textContent = message;
  node.className = "form-status " + type;
}

function setProcessStatus(message, type = "") {
  const node = $("#processFormStatus");
  node.textContent = message;
  node.className = "form-status " + type;
}

function setDecisionStatus(message, type = "") {
  const node = $("#decisionStatus");
  node.textContent = message;
  node.className = "form-status " + type;
}

function renderMetrics() {
  const items = state.inspections;
  const score = items.length ? Math.round(items.reduce((sum, item) => sum + item.qualityScore, 0) / items.length) : 0;
  const risk = items.filter((item) => item.risk && item.risk.level !== "low").length;
  $("#metricInspections").textContent = items.length;
  $("#metricScore").textContent = score;
  $("#metricRisk").textContent = risk;
}

function renderTrend() {
  const items = state.inspections.slice(0, 10).reverse();
  const max = Math.max(100, ...items.map((item) => item.qualityScore));
  $("#trendChart").innerHTML = items.length ? items.map((item, index) => {
    const riskScore = 100 - item.qualityScore;
    return '<div class="trend-bar" aria-label="第 ' + (index + 1) + ' 条记录">' +
      '<i class="score" style="height:' + (item.qualityScore / max * 100) + '%"></i>' +
      '<i class="risk" style="height:' + (Math.max(riskScore, 4) / 100 * 100) + '%"></i>' +
      '<small>' + escapeHtml(item.batchId.slice(-2)) + '</small></div>';
  }).join("") : '<p class="empty-line">暂无历史数据</p>';
}

function renderContributors(target, contributors) {
  const max = Math.max(1, ...(contributors || []).map((item) => item.value));
  target.innerHTML = (contributors || []).slice(0, 4).map((item) =>
    '<div class="contributor"><div class="contributor-top"><span>' + escapeHtml(item.name) +
    '</span><span>' + escapeHtml(item.detail) + '</span></div><div class="contributor-track"><i style="width:' +
    Math.min(100, item.value / max * 100) + '%"></i></div></div>'
  ).join("") || '<p class="empty-line">暂无解释结果</p>';
}

function renderHistory() {
  $("#historyBody").innerHTML = state.inspections.map((item) =>
    '<tr><td>' + escapeHtml(item.batchId) + '</td><td>' + escapeHtml(item.line) +
    '</td><td>' + escapeHtml(item.imageName || "-") + '</td><td>' + item.qualityScore +
    '</td><td><span class="risk-pill ' + item.risk.level + '">' + item.risk.label +
    '</span></td><td>' + formatTime(item.analyzedAt) + '</td></tr>'
  ).join("") || '<tr><td colspan="6">暂无检测记录</td></tr>';
}

function renderLatest(result) {
  state.latest = result;
  $("#resultScore").textContent = result.qualityScore;
  $("#scoreBar").style.width = result.qualityScore + "%";
  $("#resultSummary").textContent = result.summary;
  const risk = $("#resultRisk");
  risk.textContent = result.risk.label;
  risk.className = "risk-pill " + result.risk.level;
  $("#detectionList").innerHTML = result.detections.length
    ? result.detections.map((item) => '<div class="detection-item"><strong>' + escapeHtml(item.type) +
      '</strong><span>' + Math.round(item.confidence * 100) + '% / ' + item.area + ' px²</span></div>').join("")
    : '<p class="empty-line">未发现明显缺陷候选</p>';
  renderContributors($("#resultContributors"), result.contributors);
  drawDetections(result);
}

function drawDetections(result) {
  const canvas = $("#previewCanvas");
  if (!canvas.classList.contains("has-image")) return;
  const ctx = canvas.getContext("2d");
  (result.detections || []).forEach((item) => {
    const box = item.box || [20, 20, 120, 80];
    const scaleX = canvas.width / 240;
    const scaleY = canvas.height / 200;
    ctx.strokeStyle = "#f3a34a";
    ctx.lineWidth = 3;
    ctx.strokeRect(box[0] * scaleX, box[1] * scaleY, (box[2] - box[0]) * scaleX, (box[3] - box[1]) * scaleY);
    ctx.fillStyle = "rgba(243, 163, 74, .88)";
    ctx.fillRect(box[0] * scaleX, box[1] * scaleY - 22, Math.max(90, item.type.length * 14), 22);
    ctx.fillStyle = "#15100b";
    ctx.font = "bold 12px Segoe UI";
    ctx.fillText(item.type, box[0] * scaleX + 7, box[1] * scaleY - 7);
  });
}

function calculateMetrics(image, canvas) {
  const width = 240;
  const height = 200;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, width, height);
  const ratio = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * ratio;
  const drawHeight = image.height * ratio;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  let sum = 0;
  let sumSquare = 0;
  let edges = 0;
  for (let y = 1; y < height; y += 2) {
    for (let x = 1; x < width; x += 2) {
      const p = (y * width + x) * 4;
      const current = (pixels[p] + pixels[p + 1] + pixels[p + 2]) / 3;
      const left = (pixels[p - 4] + pixels[p - 3] + pixels[p - 2]) / 3;
      const up = (pixels[p - width * 4] + pixels[p - width * 4 + 1] + pixels[p - width * 4 + 2]) / 3;
      sum += current;
      sumSquare += current * current;
      if (Math.abs(current - left) > 28 || Math.abs(current - up) > 28) edges++;
    }
  }
  const count = (width / 2) * (height / 2);
  const brightness = sum / count;
  const contrast = Math.sqrt(Math.max(0, sumSquare / count - brightness * brightness));
  const edgeDensity = edges / count;
  const sharpness = Math.min(100, 100 - Math.abs(contrast - 35) * 1.4);
  return { brightness, contrast, edgeDensity, sharpness };
}

async function onImageChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 6 * 1024 * 1024) {
    setStatus("图像文件不能超过 6 MB。", "error");
    event.target.value = "";
    return;
  }
  const image = new Image();
  image.onload = () => {
    const metrics = calculateMetrics(image, $("#previewCanvas"));
    state.imageMetrics = metrics;
    state.imageName = file.name;
    state.imageDataPromise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { state.imageData = String(reader.result || ""); resolve(state.imageData); };
      reader.onerror = () => reject(new Error("图像读取失败"));
      reader.readAsDataURL(file);
    });
    $("#previewCanvas").classList.add("has-image");
    $("#imageEmpty").style.display = "none";
    $("#imageState").textContent = "已读取 · " + file.name;
    $("#imageMetrics").innerHTML = [
      ["亮度", metrics.brightness.toFixed(1)],
      ["对比度", metrics.contrast.toFixed(1)],
      ["边缘密度", metrics.edgeDensity.toFixed(3)],
      ["清晰度", metrics.sharpness.toFixed(1)]
    ].map((item) => "<span>" + item[0] + " <b>" + item[1] + "</b></span>").join("");
  };
  image.src = URL.createObjectURL(file);
}

async function runInspection(event) {
  event.preventDefault();
  const button = $("#runButton");
  button.disabled = true;
  setStatus("正在提取图像特征并请求质量分析服务…");
  const process = {
    temperature: Number($("#temperature").value),
    pressure: Number($("#pressure").value),
    speed: Number($("#speed").value)
  };
  const imageData = await state.imageDataPromise;
  const response = await fetch("/api/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      batchId: $("#batchId").value.trim(),
      line: $("#line").value,
      imageName: state.imageName || "browser-canvas",
      imageData: imageData || null,
      imageMetrics: state.imageMetrics || { brightness: 58, contrast: 28, edgeDensity: 0.18, sharpness: 72 },
      process
    })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "分析服务返回错误");
  renderLatest(result);
  state.inspections.unshift(result);
  renderMetrics();
  renderTrend();
  renderHistory();
  loadRecommendations(result).catch((error) => setDecisionStatus(error.message, "error"));
  setStatus("分析完成，结果已写入检测记录。", "success");
  button.disabled = false;
}

async function loadData() {
  const response = await fetch("/api/inspections");
  const payload = await response.json();
  state.inspections = payload.items || [];
  renderMetrics();
  renderTrend();
  renderHistory();
  const latest = state.inspections[0];
  if (latest) {
    renderContributors($("#contributorList"), latest.contributors);
    renderLatest(latest);
  }
}

function renderProcessPrediction(result) {
  state.latestProcess = result;
  $("#processPrediction").textContent = Number(result.prediction.rounded ?? result.prediction.value).toFixed(3);
  const risk = $("#processRisk");
  risk.textContent = result.risk.label;
  risk.className = "risk-pill " + result.risk.level;
  $("#processSummary").textContent = result.summary;
  const warnings = result.inputRangeWarnings || [];
  $("#processRangeState").textContent = warnings.length ? warnings.length + " 项越界" : "全部在训练范围内";
  $("#processWarnings").innerHTML = warnings.length
    ? warnings.map((item) => '<div class="detection-item"><strong>' + escapeHtml(item.label) +
      '</strong><span>' + Number(item.value).toFixed(3) + ' / [' + Number(item.trainingMin).toFixed(3) + ', ' +
      Number(item.trainingMax).toFixed(3) + ']</span></div>').join("")
    : '<p class="empty-line">输入均位于训练数据范围内</p>';
  renderContributors($("#processImportance"), (result.globalFeatureImportance || []).map((item) => ({
    name: item.label,
    value: Number(item.importance) * 100,
    detail: (Number(item.importance) * 100).toFixed(1) + "%"
  })));
}

function renderDecision(result) {
  const risk = $("#decisionRisk");
  risk.textContent = result.fusion.risk.label;
  risk.className = "risk-pill " + result.fusion.risk.level;
  $("#decisionSummary").textContent = result.fusion.humanReviewRequired
    ? "当前建议需要授权人员复核，系统仅提供候选关联和检查顺序。"
    : "当前证据支持低风险持续观察，仍需按现场质量规程执行。";
  $("#decisionConfidence").textContent = (Number(result.fusion.confidence) * 100).toFixed(1) + "%";
  $("#decisionSources").textContent = result.fusion.activeSources.join("、") || "无";
  $("#decisionEvidence").innerHTML = result.fusion.evidence.length
    ? result.fusion.evidence.map((item) => '<div class="detection-item"><strong>' + escapeHtml(item.label) +
      '</strong><span>' + escapeHtml(item.source) + " · " + escapeHtml(item.strength) + "</span><small>" + escapeHtml(item.detail) + "</small></div>").join("")
    : '<p class="empty-line">暂无证据</p>';
  $("#decisionRecommendations").innerHTML = result.recommendations.length
    ? result.recommendations.slice(0, 4).map((item) => '<div class="recommendation-item"><div class="recommendation-top"><strong>' +
      escapeHtml(item.title) + '</strong><span class="priority-' + escapeHtml(item.priority) + '">' + escapeHtml(item.priority) +
      '</span></div><p>' + escapeHtml(item.rationale) + '</p><ul>' + item.actions.slice(0, 2).map((action) => '<li>' + escapeHtml(action) + '</li>').join("") +
      '</ul><small>证据等级 ' + escapeHtml(item.evidenceGrade) + " · 需人工批准</small></div>").join("")
    : '<p class="empty-line">' + escapeHtml(result.fallbackMessage || "暂无推荐") + '</p>';
}

async function loadRecommendations(vision = state.latest) {
  const response = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ vision, processQuality: state.latestProcess, history: state.inspections.slice(0, 10), limit: 6 })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "处置推荐服务返回错误");
  renderDecision(result);
  setDecisionStatus("推荐已生成，结果保留证据来源和人工复核要求。", "success");
  return result;
}

async function loadProcessModelStatus() {
  const response = await fetch("/api/process-quality/status");
  const status = await response.json();
  const badge = $("#processModelStatus");
  if (status.online) {
    badge.textContent = "模型在线";
    badge.className = "risk-pill low";
    const testMetrics = status.health?.evaluation?.test;
    $("#processModelMetric").textContent = testMetrics
      ? "MAE " + Number(testMetrics.mae).toFixed(3) + " · R² " + Number(testMetrics.r2).toFixed(3)
      : "RandomForest 已加载";
    return;
  }
  badge.textContent = status.endpointConfigured ? "服务离线" : "未配置";
  badge.className = "risk-pill " + (status.endpointConfigured ? "high" : "medium");
  $("#processModelMetric").textContent = status.endpointConfigured ? "等待 Python 服务" : "等待模型端点";
}

async function runProcessPrediction(event) {
  event.preventDefault();
  const button = $("#processPredictButton");
  button.disabled = true;
  setProcessStatus("正在请求 RandomForest 工艺质量模型…");
  try {
    const features = {};
    document.querySelectorAll("[data-process-feature]").forEach((input) => {
      features[input.dataset.processFeature] = Number(input.value);
    });
    const response = await fetch("/api/process-quality/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ features })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "工艺质量模型返回错误");
    renderProcessPrediction(result);
    if (state.latest) loadRecommendations().catch((error) => setDecisionStatus(error.message, "error"));
    setProcessStatus("预测完成。", "success");
  } finally {
    button.disabled = false;
  }
}

$("#imageInput").addEventListener("change", onImageChange);
$("#inspectionForm").addEventListener("submit", (event) => runInspection(event).catch((error) => {
  setStatus(error.message, "error");
  $("#runButton").disabled = false;
}));
$("#processQualityForm").addEventListener("submit", (event) => runProcessPrediction(event).catch((error) => {
  setProcessStatus(error.message, "error");
}));
$("#recommendationButton").addEventListener("click", () => loadRecommendations().catch((error) => setDecisionStatus(error.message, "error")));
$("#refreshButton").addEventListener("click", () => loadData().catch((error) => setStatus(error.message, "error")));
document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
  item.classList.add("active");
  document.getElementById(item.dataset.target).scrollIntoView({ behavior: "smooth" });
}));
$("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date());
loadData().catch((error) => setStatus(error.message, "error"));
loadProcessModelStatus().catch(() => {
  $("#processModelStatus").textContent = "状态未知";
  $("#processModelStatus").className = "risk-pill high";
  $("#processModelMetric").textContent = "状态接口不可用";
});
