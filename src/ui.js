/** Escape all dynamic content before interpolating into trusted component templates. @param {string} value */
export function escapeHtml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}
/** @param {string} name */
export function icon(name) {
  /** @type {Record<string, string>} */
  const paths = {
    bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
    search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
    settings: "M4 7h16M4 17h16M8 4v6M16 14v6",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
    user: "M20 21v-2a8 8 0 0 0-16 0v2h16ZM16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    radar: "M20 12a8 8 0 1 1-8-8M16 12a4 4 0 1 1-4-4m0 4 9-9M12 12h.01",
    folder: "M3 6h6l2 2h10v12H3V6Zm5 6v4m4-4v4m4-4v4",
    services: "M7 3h10v18H7V3Zm3 5h4m-4 4h4m-4 4h4",
    game: "M7 7h10l4 12h-4l-3-3h-4l-3 3H3L7 7Zm0 4v4m-2-2h4m7-2h.01m2 3h.01",
    close: "m6 6 12 12M6 18 18 6",
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.bolt}"/></svg>`;
}
/** @param {string} text @param {string} [state] */
export function badge(text, state = "neutral") {
  return `<span class="badge" data-state="${escapeHtml(state)}">${escapeHtml(text)}</span>`;
}
/** @param {string} text @param {string} [state] */
export function status(text, state = "neutral") {
  return `<span class="status" data-state="${escapeHtml(state)}"><span class="dot" aria-hidden="true"></span>${escapeHtml(text)}</span>`;
}
