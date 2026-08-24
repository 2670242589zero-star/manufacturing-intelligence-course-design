const state = { inspections: [], latest: null, imageMetrics: null, imageName: "" };
const $ = (selector) => document.querySelector(selector);
const formatTime = (value) => new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));

function setStatus(message, type = "") {
  const node = $("#formStatus");
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
  const image = new Image();
  image.onload = () => {
    const metrics = calculateMetrics(image, $("#previewCanvas"));
    state.imageMetrics = metrics;
    state.imageName = file.name;
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
  const response = await fetch("/api/inspect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      batchId: $("#batchId").value.trim(),
      line: $("#line").value,
      imageName: state.imageName || "browser-canvas",
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

$("#imageInput").addEventListener("change", onImageChange);
$("#inspectionForm").addEventListener("submit", (event) => runInspection(event).catch((error) => {
  setStatus(error.message, "error");
  $("#runButton").disabled = false;
}));
$("#refreshButton").addEventListener("click", () => loadData().catch((error) => setStatus(error.message, "error")));
document.querySelectorAll(".nav-item").forEach((item) => item.addEventListener("click", () => {
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.remove("active"));
  item.classList.add("active");
  document.getElementById(item.dataset.target).scrollIntoView({ behavior: "smooth" });
}));
$("#todayLabel").textContent = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date());
loadData().catch((error) => setStatus(error.message, "error"));
