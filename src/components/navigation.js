import { icon, status } from "../ui.js";

export function topNavigation() {
  return `<header class="topbar">
    <a class="brand" href="#home" aria-label="KRZ Boost home"><span class="brand-mark">${icon("bolt")}</span><strong>KRZ<span class="brand-dot">·</span></strong><span>Boost</span></a>
    <nav aria-label="Main navigation">
      <a href="#home" aria-current="page">Home</a>
      <a href="#modules">Optimize</a>
      <a href="#gaming">Gaming</a>
      <a href="#performance">Performance</a>
      <a href="#tools">Tools</a>
      <a href="#restore">Restore Center</a>
    </nav>
    <div class="utilities">
      <button class="search-trigger" data-dialog="search" aria-label="Search modules (Control K)" aria-keyshortcuts="Control+k Meta+k">${icon("search")}<span>Search</span><kbd>Ctrl K</kbd></button>
      <button class="system-status" data-dialog="system" aria-label="View system connection status">${status("Not connected")}</button>
      <button class="icon-button" data-dialog="notifications" aria-label="Notifications" title="Notifications">${icon("bell")}</button>
      <button class="icon-button" data-dialog="settings" aria-label="Settings" title="Settings (Ctrl ,)" aria-keyshortcuts="Control+, Meta+,">${icon("settings")}</button>
      <button class="icon-button" data-dialog="profile" aria-label="Profile" title="Profile">${icon("user")}</button>
    </div>
  </header>`;
}
