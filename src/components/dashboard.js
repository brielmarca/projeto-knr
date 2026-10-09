import { topNavigation } from "./navigation.js";
import { hardwareMetric } from "./hardware.js";
import { systemOrb } from "./orb.js";
import { modules, optimizationCard } from "./modules.js";
import { badge, icon, status, escapeHtml as e } from "../ui.js";
import { connectionLabel, telemetryLabel } from "../data/state.js";

/** @param {import('../data/state.js').DashboardState} state */
export function appShell(state) {
  const mock = state.source === "mock";
  return `<a class="skip-link" href="#home">Skip to dashboard</a>
    ${topNavigation(state)}
    <main id="home" tabindex="-1">
      <section class="hardware-strip" aria-label="Hardware overview">${state.hardware.map((metric) => hardwareMetric(metric, mock)).join("")}</section>
      <div class="dashboard">
        <section class="card hero" aria-labelledby="hero-title">
          <div class="hero-content">
            <div class="hero-toolbar"><span class="badge" data-state="neutral" id="telemetry-status" role="status">${e(telemetryLabel(state))}</span>
              <div class="mode-switch" role="group" aria-label="Optimization mode">
                <button data-mode="smart" aria-pressed="true">${icon("shield")}Smart Mode</button>
                <button data-mode="advanced" aria-pressed="false">${icon("settings")}Advanced</button>
              </div>
            </div>
            <div><h1 id="hero-title">Your PC can perform better.</h1><p class="hero-description">Understand what’s holding your PC back. Review focused optimizations and stay in control of every change.</p></div>
            <div class="impact-grid">${["Frametime lows", "Reclaimable cache", "Background memory"].map((label, i) => `<div><span>${label}</span><strong>${e(state.impacts[i])}</strong><small>${mock ? ["Example benchmark delta", "Example cache estimate", "Example memory reduction"][i] : "Analysis required"}</small></div>`).join("")}</div>
            <div class="hero-actions"><button class="button button-primary" id="analyze">${icon("radar")}<span>Analyze my PC</span></button><button class="button" id="custom-optimize">${icon("settings")}Custom Optimize</button><span class="restore-hint">${icon("shield")}Restore point ${mock ? "preview" : "not verified"}</span></div>
            <p class="feedback" id="analysis-feedback" role="status" aria-live="polite">${mock ? "Preview only. No Windows settings will be changed." : "Connect the Windows engine to enable diagnostics."}</p>
          </div>
          <div class="orb-column">${systemOrb(state)}</div>
        </section>
        <div class="lower-grid">
          <section class="card baseline" id="restore" aria-labelledby="baseline-title" tabindex="-1">
            <div class="section-header"><h2 id="baseline-title">${icon("shield")}Baseline & Diagnostic Health</h2>${badge(mock ? "Sample · Secure" : "Not verified", mock ? "healthy" : "neutral")}</div>
            <dl class="baseline-details"><div><dt>Last Baseline Audit<small>${mock ? "Example diagnostic snapshot" : "No Windows engine connected"}</small></dt><dd>${e(state.audit)}</dd></div><div><dt>Identified Optimizations<small>Review findings before applying changes</small></dt><dd>${e(state.findings)}</dd></div></dl>
            <div class="benchmark"><span>${icon("radar")}${mock ? "Example benchmark projection" : "Benchmark projection"}</span><strong>${mock ? e(state.impacts[0]) + " Avg 1% Low FPS" : "Awaiting analysis"}</strong><p>${mock ? "Development fixture from the approved design. This is not a measurement of your PC." : "Measured results will appear here when a Windows diagnostic source is connected."}</p></div>
            <div class="baseline-note">${icon("shield")}<p><strong>You stay in control.</strong> Review changes and verify a Windows restore point before applying an optimization.</p></div>
          </section>
          <section class="card modules-panel" id="modules" aria-labelledby="modules-title" tabindex="-1">
            <div class="section-header"><h2 id="modules-title">${icon("bolt")}Direct Optimization Modules</h2><span class="section-meta">Review before applying</span></div>
            <div class="modules-grid">${modules.map((module, i) => optimizationCard(module, state.results[i], mock)).join("")}</div>
          </section>
        </div>
      </div>
    </main>
    <footer><span>Profile: <strong>Balanced Performance</strong></span><span>Windows System Restore: <strong>${e(state.restore)}</strong></span><span class="footer-source">${e(state.memoryTelemetry ? telemetryLabel(state) : mock ? "Development preview · Mock data" : "Windows engine not connected")}</span></footer>
    <dialog id="utility-dialog" aria-labelledby="dialog-title"><div class="dialog-header"><h2 id="dialog-title"></h2><button class="icon-button" id="close-dialog" aria-label="Close dialog">${icon("close")}</button></div><div id="dialog-content"></div></dialog>`;
}

/** Update only telemetry, preserving focus, open dialogs and bound interactions.
 * @param {Element} app
 * @param {import('../data/state.js').DashboardState} state
 */
export function updateMemoryTelemetry(app, state) {
  app.setAttribute("data-source", state.source);
  for (const label of ["CPU", "Memory"]) {
    const metric = state.hardware.find((item) => item.label === label);
    const card = app.querySelector(`[data-metric="${label}"]`);
    if (metric && card) card.outerHTML = hardwareMetric(metric, false);
  }
  for (const selector of ["#telemetry-status", ".footer-source"]) {
    const label = app.querySelector(selector);
    if (label) label.textContent = telemetryLabel(state);
  }
  const connection = app.querySelector(".system-status");
  if (connection) connection.innerHTML = status(connectionLabel(state));
}
