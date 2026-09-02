const PROCESS_FEATURES = [
  "iron_feed_pct",
  "silica_feed_pct",
  "starch_flow",
  "amina_flow",
  "ore_pulp_flow",
  "ore_pulp_ph",
  "ore_pulp_density",
  "flotation_air_flow_avg",
  "flotation_level_avg"
];

function normalizeEndpoint(value = "") {
  return String(value).trim().replace(/\/$/, "");
}

function validateFeatures(features) {
  if (!features || typeof features !== "object" || Array.isArray(features)) throw new Error("invalid_process_features");
  const normalized = {};
  for (const feature of PROCESS_FEATURES) {
    if (!(feature in features)) throw new Error("invalid_process_features");
    const value = Number(features[feature]);
    if (!Number.isFinite(value)) throw new Error("invalid_process_features");
    normalized[feature] = value;
  }
  return normalized;
}

function createProcessQualityAdapter(options = {}) {
  const endpoint = normalizeEndpoint(options.endpoint ?? process.env.PROCESS_QUALITY_MODEL_ENDPOINT);
  const timeoutMs = Number(options.timeoutMs ?? process.env.PROCESS_QUALITY_MODEL_TIMEOUT_MS ?? 5000);
  let lastRequest = null;
  let lastError = null;

  async function request(path, init) {
    try {
      const response = await fetch(endpoint + path, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!response.ok) throw new Error("http_" + response.status);
      return await response.json();
    } catch (error) {
      lastError = { message: error.message, at: new Date().toISOString() };
      throw new Error("process_model_unavailable");
    }
  }

  async function predict(features) {
    const normalized = validateFeatures(features);
    if (!endpoint) throw new Error("process_model_not_configured");
    const requestedAt = new Date().toISOString();
    const result = await request("/predict", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ features: normalized })
    });
    if (!result?.prediction || !Number.isFinite(Number(result.prediction.value)) || !result.risk) {
      lastError = { message: "invalid_model_response", at: new Date().toISOString() };
      throw new Error("process_model_invalid_response");
    }
    lastRequest = { requestedAt, completedAt: new Date().toISOString(), modelId: result.modelId };
    lastError = null;
    return result;
  }

  async function status() {
    if (!endpoint) {
      return {
        configuredMode: "disabled",
        activeAdapter: "Process-quality model not configured",
        endpointConfigured: false,
        online: false,
        timeoutMs,
        features: PROCESS_FEATURES,
        lastRequest,
        lastError
      };
    }
    try {
      const health = await request("/health", { method: "GET" });
      lastError = null;
      return {
        configuredMode: "remote",
        activeAdapter: "RandomForest HTTP adapter",
        endpointConfigured: true,
        online: true,
        timeoutMs,
        health,
        lastRequest,
        lastError
      };
    } catch {
      return {
        configuredMode: "remote",
        activeAdapter: "RandomForest HTTP adapter",
        endpointConfigured: true,
        online: false,
        timeoutMs,
        lastRequest,
        lastError
      };
    }
  }

  return { predict, status };
}

module.exports = { PROCESS_FEATURES, createProcessQualityAdapter, validateFeatures };
