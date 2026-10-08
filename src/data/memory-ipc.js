import { invoke, isTauri } from "@tauri-apps/api/core";
import { systemSnapshotSchema } from "@krz/contracts";
import { memorySnapshotState, unavailableState } from "./state.js";

export { isTauri };

/** Single read-only request. Browser callers never invoke IPC; errors never use fixtures.
 * @param {{isDesktop?: () => boolean, invokeCommand?: (command: string) => Promise<unknown>, timeoutMs?: number}} [options]
 * @returns {Promise<import('./state.js').DashboardState>}
 */
export async function collectMemoryState({
  isDesktop = isTauri,
  invokeCommand = invoke,
  timeoutMs = 5000,
} = {}) {
  if (!isDesktop()) return unavailableState();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  try {
    const response = await Promise.race([
      invokeCommand("collect_system_snapshot"),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject({ code: "TIMEOUT" }), timeoutMs);
      }),
    ]);
    const parsed = systemSnapshotSchema.safeParse(response);
    if (!parsed.success) throw { code: "INVALID_SNAPSHOT" };
    return memorySnapshotState(parsed.data);
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;
    /** @type {Record<string, string>} */
    const messages = {
      UNSUPPORTED_PLATFORM: "Memory collection requires Windows.",
      WINDOWS_API: "Windows could not read physical memory.",
      INVALID_MEMORY:
        "The native collector returned invalid memory measurements.",
      INVALID_SNAPSHOT: "The native snapshot failed validation.",
      COLLECTION_TASK_FAILED: "The memory collection worker failed.",
      TIMEOUT: "The memory request timed out. Reload to try again.",
    };
    const state = unavailableState();
    state.memoryTelemetry = {
      status: code === "UNSUPPORTED_PLATFORM" ? "unavailable" : "error",
      message:
        typeof code === "string" && Object.hasOwn(messages, code)
          ? messages[code]
          : "Memory collection failed. Reload to try again.",
    };
    return state;
  } finally {
    clearTimeout(timer);
  }
}
