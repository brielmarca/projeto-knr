import { status, escapeHtml as e } from "../ui.js";

/** @param {import('../data/state.js').DashboardState} state */
export function systemOrb(state) {
  const mock = state.source === "mock";
  return `<div class="orb" role="img" aria-label="${mock ? "Sample diagnostic visualization. System healthy. Four example modules." : "System diagnostics unavailable. Connect Windows telemetry to see status."}">
    <svg class="orb-rings" viewBox="0 0 320 320" aria-hidden="true">
      <circle class="calibration" cx="160" cy="160" r="148" stroke-dasharray="1 7"/>
      ${[132, 108, 84, 62].map((r) => `<circle class="track" cx="160" cy="160" r="${r}"/>`).join("")}
      ${[132, 108, 84].map((r, i) => `<circle class="arc ${i === 0 ? "arc-active" : ""}" cx="160" cy="160" r="${r}" pathLength="100" stroke-dasharray="${mock ? [18, 35, 58][i] : 0} 100"/>`).join("")}
      <path class="crosshair" d="M160 0v320M0 160h320"/>
    </svg>
    <div class="orb-core">${status(mock ? "Sample · Healthy" : "Not connected", mock ? "healthy" : "neutral")}<strong>All Subsystems</strong><span>${mock ? "4 example modules" : "Awaiting telemetry"}</span></div>
    <div class="orb-callout orb-cpu">${status("CPU", mock ? "healthy" : "neutral")}<strong>${e(state.hardware[0].value)}</strong></div>
    <div class="orb-callout orb-memory">${status("RAM", mock ? "healthy" : "neutral")}<strong>${e(state.hardware[2].detail)}</strong></div>
    <div class="orb-callout orb-storage">${status("NVMe", mock ? "healthy" : "neutral")}<strong>${e(state.hardware[3].detail)}</strong></div>
  </div>`;
}
