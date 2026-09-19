import { badge, icon, escapeHtml as e } from "../ui.js";

export const modules = [
  {
    id: "tools",
    title: "Clean Temporary & Shader Cache",
    description:
      "Review temporary files, shader caches, and leftover update files.",
    icon: "folder",
    label: "Safe · Low Risk",
    state: "healthy",
    action: "Review cache",
  },
  {
    id: "services",
    title: "Trim Inactive Background Services",
    description:
      "Review background services and choose what can pause when you need performance.",
    icon: "services",
    label: "Recommended",
    state: "recommended",
    action: "Inspect Services",
  },
  {
    id: "gaming",
    title: "Game Bar & DWM Latency Tweak",
    description:
      "Inspect game capture and desktop composition settings before making changes.",
    icon: "game",
    label: "Needs Attention",
    state: "warning",
    action: "View Tweaks",
  },
  {
    id: "performance",
    title: "Power & Core Parking Plan",
    description:
      "Review your power plan and processor settings for your current workload.",
    icon: "bolt",
    label: "Reversible",
    state: "neutral",
    action: "Configure",
  },
];

/** @param {typeof modules[number]} module @param {string} result @param {boolean} mock */
export function optimizationCard(module, result, mock) {
  return `<article class="card optimization-card" id="${module.id}" tabindex="-1">
    <div class="module-top">${icon(module.icon)}${badge(mock ? module.label : "Analysis required", mock ? module.state : "neutral")}</div>
    <h3>${e(module.title)}</h3><p>${e(module.description)}</p>
    <div class="module-bottom"><span>${e(result)}</span><button class="button button-small" data-module="${module.id}">${module.action}</button></div>
  </article>`;
}
