import { escapeHtml as e } from "../ui.js";

/** @param {import('../data/state.js').HardwareMetric} metric @param {boolean} mock */
export function hardwareMetric(metric, mock) {
  const parts = metric.value.match(/^([\d.]+)(.*)$/);
  const value = parts
    ? `${e(parts[1])}<small>${e(parts[2])}</small>`
    : e(metric.value);
  return `<article class="card hardware-metric" aria-label="${e(metric.label)}${mock ? " sample data" : " unavailable"}">
    <div class="metric-top"><span class="status" data-state="${mock ? "healthy" : "neutral"}"><span class="dot" aria-hidden="true"></span>${e(metric.label)}<span class="sr-only">${mock ? "Sample healthy status" : "Not connected"}</span></span><span class="metric-detail">${e(metric.detail)}</span></div>
    <div class="metric-bottom"><span class="hardware-name" title="${e(metric.name)}">${e(metric.name)}</span><strong>${value}</strong></div>
    <meter min="0" max="100" value="${metric.percent ?? 0}" aria-label="${e(metric.label)} sample activity" ${metric.percent === null ? "hidden" : ""}>${metric.percent ?? 0}%</meter>
  </article>`;
}
