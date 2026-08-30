const { analyzeVision } = require("./vision");

function normalizeEndpoint(value = "") {
  return String(value).trim().replace(/\/$/, "");
}

function createInferenceAdapter(options = {}) {
  const endpoint = normalizeEndpoint(options.endpoint ?? process.env.VISION_MODEL_ENDPOINT);
  const timeoutMs = Number(options.timeoutMs ?? process.env.VISION_MODEL_TIMEOUT_MS ?? 5000);
  const fallbackEnabled = String(options.fallbackEnabled ?? process.env.VISION_MODEL_FALLBACK ?? "true") !== "false";
  let lastRequest = null;
  let lastError = null;

  async function requestRemote(payload) {
    const response = await fetch(endpoint + "/infer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!response.ok) throw new Error("model_service_http_" + response.status);
    const result = await response.json();
    if (!result || !Number.isFinite(Number(result.qualityScore)) || !result.risk) throw new Error("invalid_model_response");
    return { ...result, method: result.method || "OpenCV + YOLO HTTP adapter" };
  }

  async function analyze(imageMetrics = {}, process = {}, context = {}, imageData = "") {
    const requestedAt = new Date().toISOString();
    if (!endpoint) {
      const result = analyzeVision(imageMetrics, process);
      lastRequest = { requestedAt, completedAt: new Date().toISOString(), mode: "local", degraded: false };
      lastError = null;
      return result;
    }
    try {
      const payload = { imageMetrics, process, context };
      if (imageData) payload.imageData = imageData;
      const result = await requestRemote(payload);
      lastRequest = { requestedAt, completedAt: new Date().toISOString(), mode: "remote", degraded: false };
      lastError = null;
      return result;
    } catch (error) {
      lastError = { message: error.message, at: new Date().toISOString() };
      if (!fallbackEnabled) throw error;
      const result = analyzeVision(imageMetrics, process);
      lastRequest = { requestedAt, completedAt: new Date().toISOString(), mode: "local-fallback", degraded: true };
      return { ...result, method: result.method + " (remote fallback)" };
    }
  }

  function status() {
    return {
      configuredMode: endpoint ? "remote" : "local",
      activeAdapter: endpoint ? "OpenCV / YOLO HTTP" : "Canvas metrics / explainable rules",
      endpointConfigured: Boolean(endpoint), timeoutMs, fallbackEnabled, lastRequest, lastError
    };
  }

  return { analyze, status };
}

module.exports = { createInferenceAdapter };
