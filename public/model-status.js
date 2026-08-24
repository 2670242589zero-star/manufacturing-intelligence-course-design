(async function showModelStatus() {
  const title = document.querySelector(".sidebar-note strong");
  const detail = document.querySelector(".sidebar-note small");
  const dot = document.querySelector(".sidebar-note .status-dot");
  if (!title || !detail) return;
  try {
    const response = await fetch("/api/model-status");
    if (!response.ok) throw new Error("status_unavailable");
    const status = await response.json();
    const degraded = Boolean(status.lastRequest?.degraded);
    title.textContent = degraded ? "推理服务已降级" : "推理服务在线";
    detail.textContent = status.activeAdapter + (degraded ? " / local fallback" : "");
    if (dot && degraded) dot.style.background = "var(--warning)";
  } catch {
    title.textContent = "推理状态未知";
    detail.textContent = "请检查 /api/model-status";
    if (dot) dot.style.background = "var(--danger)";
  }
})();
