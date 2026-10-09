import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./tokens.css";
import "./styles.css";
import { unavailableState } from "./data/state.js";
import { appShell, updateMemoryTelemetry } from "./components/dashboard.js";
import { bindInteractions } from "./interactions.js";
import { collectMemoryState, isTauri } from "./data/memory-ipc.js";

let state = unavailableState();
const desktop = isTauri();
if (desktop) {
  state.memoryTelemetry = {
    status: "loading",
    message: "Reading physical memory and sampling CPU usage…",
  };
} else if (import.meta.env.DEV) {
  state = (await import("./data/mock.js")).mockState;
}
const app = document.querySelector("#app");
if (app) {
  app.innerHTML = appShell(state);
  app.setAttribute("data-source", state.source);
  const refreshSystemConnection = bindInteractions(state);
  if (desktop) {
    const snapshotState = await collectMemoryState();
    Object.assign(state, snapshotState);
    updateMemoryTelemetry(app, state);
    refreshSystemConnection();
  }
}
