import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./tokens.css";
import "./styles.css";
import { unavailableState } from "./data/state.js";
import { appShell } from "./components/dashboard.js";
import { bindInteractions } from "./interactions.js";

let state = unavailableState();
if (import.meta.env.DEV) {
  state = (await import("./data/mock.js")).mockState;
}
const app = document.querySelector("#app");
if (app) {
  app.innerHTML = appShell(state);
  app.setAttribute("data-source", state.source);
  bindInteractions(state);
}
