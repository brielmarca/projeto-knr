import { modules } from "./components/modules.js";
import { escapeHtml as e, badge } from "./ui.js";

/** @param {import('./data/state.js').DashboardState} state */
export function bindInteractions(state) {
  const dialog = /** @type {HTMLDialogElement} */ (
    document.querySelector("#utility-dialog")
  );
  const title = /** @type {HTMLElement} */ (
    document.querySelector("#dialog-title")
  );
  const content = /** @type {HTMLElement} */ (
    document.querySelector("#dialog-content")
  );
  const feedback = /** @type {HTMLElement} */ (
    document.querySelector("#analysis-feedback")
  );
  const analyze = /** @type {HTMLButtonElement} */ (
    document.querySelector("#analyze")
  );
  const mock = state.source === "mock";
  let mode = "smart";

  /** @param {string} heading @param {string} markup */
  function openDialog(heading, markup) {
    title.textContent = heading;
    content.innerHTML = markup;
    if (!dialog.open) dialog.showModal();
  }

  /** @param {string} next */
  function selectMode(next) {
    mode = next;
    document.querySelectorAll("[data-mode]").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.getAttribute("data-mode") === mode),
      );
    });
    feedback.textContent =
      mode === "advanced"
        ? "Advanced mode · Review individual modules before making changes."
        : mock
          ? "Preview only. No Windows settings will be changed."
          : "Connect the Windows engine to enable diagnostics.";
    feedback.removeAttribute("data-state");
  }
  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () =>
      selectMode(button.getAttribute("data-mode") ?? "smart"),
    );
  });

  document
    .querySelector("#close-dialog")
    ?.addEventListener("click", () => dialog.close());
  // Search inputs otherwise consume Escape to clear text before the dialog sees it.
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      dialog.close();
    }
  });
  document.querySelector("#custom-optimize")?.addEventListener("click", () => {
    selectMode("advanced");
    location.hash = "modules";
    document.querySelector("#modules")?.scrollIntoView({ block: "start" });
    /** @type {HTMLElement | null} */ (
      document.querySelector("#modules")
    )?.focus({ preventScroll: true });
  });

  /** @param {string} id */
  function showModule(id) {
    const module = modules.find((item) => item.id === id);
    if (!module) return;
    openDialog(
      module.title,
      `${badge(mock ? "Development preview · Mock data" : "Windows engine not connected")}<p>${e(module.description)}</p><p class="dialog-note">${mock ? "This preview contains example findings only." : "No diagnostic findings are available yet."} Connect a Windows engine and verify a restore point before applying changes.</p><button class="button" disabled aria-describedby="apply-unavailable">Apply optimization</button><p class="dialog-note" id="apply-unavailable">Applying changes is unavailable without a Windows integration.</p>`,
    );
  }
  document.querySelectorAll("[data-module]").forEach((button) => {
    button.addEventListener("click", () =>
      showModule(button.getAttribute("data-module") ?? ""),
    );
  });

  function openSearch() {
    openDialog(
      "Search KRZ Boost",
      '<label class="field-label">Find an optimization module<input type="search" id="module-search" placeholder="Search cache, services, gaming…" autocomplete="off" maxlength="100" /></label><div class="search-results" id="search-results"></div><p class="sr-only" role="status" id="search-count"></p>',
    );
    const input = /** @type {HTMLInputElement} */ (
      document.querySelector("#module-search")
    );
    const results = /** @type {HTMLElement} */ (
      document.querySelector("#search-results")
    );
    const count = /** @type {HTMLElement} */ (
      document.querySelector("#search-count")
    );
    function filterResults() {
      const query = input.value.trim().toLowerCase();
      const matches = modules.filter((module) =>
        `${module.title} ${module.description}`.toLowerCase().includes(query),
      );
      results.replaceChildren();
      for (const module of matches) {
        const button = document.createElement("button");
        button.className = "button";
        button.textContent = module.title;
        button.addEventListener("click", () => {
          dialog.close();
          location.hash = module.id;
          /** @type {HTMLElement | null} */ (
            document.getElementById(module.id)
          )?.focus();
        });
        results.append(button);
      }
      count.textContent = `${matches.length} modules found`;
      if (!matches.length) {
        const empty = document.createElement("p");
        empty.textContent = "No matching modules. Try “cache” or “power”.";
        results.append(empty);
      }
    }
    filterResults();
    input.addEventListener("input", filterResults);
    input.focus();
  }

  /** @param {string} name */
  function openUtility(name) {
    if (name === "search") return openSearch();
    if (name === "system")
      openDialog(
        "System connection",
        "<p>Windows telemetry is not connected. Hardware health, protection, and restore status cannot be verified.</p>" +
          (mock
            ? '<p class="dialog-note">The dashboard currently displays labeled development fixtures from the Stitch design.</p>'
            : ""),
      );
    if (name === "notifications")
      openDialog(
        "Notifications",
        '<p>No notifications available.</p><p class="dialog-note">System notifications will appear when a Windows engine is connected.</p>',
      );
    if (name === "profile")
      openDialog(
        "Profile",
        '<p>Local dashboard · Balanced Performance</p><p class="dialog-note">No account is connected. The displayed profile is a UI preference, not an active Windows power plan.</p>',
      );
    if (name === "settings") {
      openDialog(
        "Settings",
        `<p>Default optimization mode for this session</p><div class="mode-switch" role="group" aria-label="Default optimization mode"><button data-setting="smart" aria-pressed="${mode === "smart"}">Smart Mode</button><button data-setting="advanced" aria-pressed="${mode === "advanced"}">Advanced</button></div><p class="dialog-note">${mock ? "Development preview uses sample data." : "Telemetry source: not connected."} Preferences are kept for this session only.</p>`,
      );
      content.querySelectorAll("[data-setting]").forEach((button) =>
        button.addEventListener("click", () => {
          selectMode(button.getAttribute("data-setting") ?? "smart");
          content
            .querySelectorAll("[data-setting]")
            .forEach((item) =>
              item.setAttribute(
                "aria-pressed",
                String(item.getAttribute("data-setting") === mode),
              ),
            );
        }),
      );
    }
  }
  document
    .querySelectorAll("[data-dialog]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openUtility(button.getAttribute("data-dialog") ?? ""),
      ),
    );

  document.addEventListener("keydown", (event) => {
    if (event.repeat || event.altKey || !(event.ctrlKey || event.metaKey))
      return;
    if (event.key.toLowerCase() === "k" || event.key === ",") {
      event.preventDefault();
      openUtility(event.key === "," ? "settings" : "search");
    }
  });

  analyze.addEventListener("click", async () => {
    if (analyze.disabled) return;
    analyze.disabled = true;
    analyze.setAttribute("aria-busy", "true");
    const label = /** @type {HTMLElement} */ (analyze.querySelector("span"));
    label.textContent = mock ? "Loading sample…" : "Checking connection…";
    feedback.textContent = mock
      ? "Loading the development diagnostic fixture…"
      : "Checking Windows diagnostics availability…";
    feedback.removeAttribute("data-state");
    try {
      // Yield a paint so assistive technology and the button expose the busy state.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (!mock)
        throw new Error(
          "Windows engine not connected. Connect the engine and try again.",
        );
      feedback.textContent =
        "Sample review ready · 4 example modules. No system scan or changes were performed.";
      feedback.dataset.state = "success";
    } catch (error) {
      feedback.textContent =
        error instanceof Error
          ? error.message
          : "Diagnostics unavailable. Please try again.";
      feedback.dataset.state = "critical";
    } finally {
      analyze.disabled = false;
      analyze.removeAttribute("aria-busy");
      label.textContent = "Analyze my PC";
    }
  });
}
