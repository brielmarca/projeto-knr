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
      UNSUPPORTED_PLATFORM: "System telemetry collection requires Windows.",
      WINDOWS_API: "Windows could not read physical memory.",
      INVALID_MEMORY:
        "The native collector returned invalid memory measurements.",
      INVALID_CPU: "The native collector returned invalid CPU measurements.",
      STORAGE_WINDOWS_API: "Windows could not read system-drive storage.",
      INVALID_STORAGE:
        "The native collector returned invalid system-drive measurements.",
      CPU_WINDOWS_API: "Windows could not read CPU telemetry.",
      UNSUPPORTED_CPU_TOPOLOGY:
        "CPU sampling requires a single Windows processor group.",
      INVALID_SNAPSHOT: "The native snapshot failed validation.",
      COLLECTION_TASK_FAILED: "The telemetry collection worker failed.",
      TIMEOUT: "The snapshot request timed out. Reload to try again.",
    };
    const state = unavailableState();
    state.memoryTelemetry = {
      status: code === "UNSUPPORTED_PLATFORM" ? "unavailable" : "error",
      message:
        typeof code === "string" && Object.hasOwn(messages, code)
          ? messages[code]
          : "System telemetry collection failed. Reload to try again.",
    };
    return state;
  } finally {
    clearTimeout(timer);
  }
}
