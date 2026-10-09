/** @typedef {{label: string, name: string, value: string, detail: string, percent: number | null}} HardwareMetric */
/** @typedef {{status: 'loading' | 'ready' | 'unavailable' | 'error', message: string, collectedAt?: string}} MemoryTelemetry */
/** @typedef {{source: 'unavailable' | 'mock' | 'native', memoryTelemetry?: MemoryTelemetry, cpu?: import('@krz/contracts').CpuSnapshot, hardware: HardwareMetric[], impacts: string[], audit: string, findings: string, restore: string, results: string[]}} DashboardState */

/** No inferred health, measurements, or restore guarantees without telemetry. @returns {DashboardState} */
export function unavailableState() {
  return {
    source: "unavailable",
    hardware: ["CPU", "GPU", "Memory", "Storage", "Network"].map((label) => ({
      label,
      name: "Not connected",
      value: "—",
      detail: "Unavailable",
      percent: null,
    })),
    impacts: ["—", "—", "—"],
    audit: "No audit available",
    findings: "Analysis required",
    restore: "Not verified",
    results: [
      "Analysis required",
      "Analysis required",
      "Analysis required",
      "Analysis required",
    ],
  };
}

/** Start from disconnected state so a snapshot never implies uncollected measurements.
 * @param {import('@krz/contracts').SystemSnapshotV1} snapshot Validated IPC data.
 * @returns {DashboardState}
 */
export function memorySnapshotState(snapshot) {
  const state = unavailableState();
  const memory = snapshot.memory;
  const cpu = snapshot.cpu;
  if (cpu) {
    state.source = "native";
    state.cpu = cpu;
    state.hardware[0] = {
      label: "CPU",
      name: cpu.model,
      value: `${Number(cpu.usagePercent.toFixed(1))}%`,
      detail: `${cpu.physicalCoreCount}C / ${cpu.logicalCoreCount}T · ${cpu.sampleDurationMs} ms`,
      percent: cpu.usagePercent,
    };
  }
  state.memoryTelemetry = {
    status: memory === null ? "unavailable" : "ready",
    message:
      memory === null
        ? "The native snapshot contains no memory measurement."
        : "Physical memory snapshot collected once at startup; not live monitoring.",
    collectedAt: snapshot.collectedAt,
  };
  if (memory === null) return state;
  state.source = "native";
  state.hardware = state.hardware.map((metric) =>
    metric.label === "Memory"
      ? {
          label: "Memory",
          name: "Physical memory",
          value: `${Number(memory.usagePercent.toFixed(1))}%`,
          detail: `${(memory.usedBytes / 1024 ** 3).toFixed(1)} / ${(memory.totalBytes / 1024 ** 3).toFixed(1)} GiB`,
          percent: memory.usagePercent,
        }
      : metric,
  );
  return state;
}

/** @param {DashboardState} state */
export function telemetryLabel(state) {
  if (state.source === "mock") return "Development preview · Mock data";
  if (state.cpu) return `Native snapshot · ${connectionLabel(state)}`;
  if (!state.memoryTelemetry) return "Windows telemetry · Not connected";
  return {
    loading: "System snapshot · Loading",
    ready: "Native snapshot · Memory only",
    unavailable: "System snapshot · Unavailable",
    error: "System snapshot · Error",
  }[state.memoryTelemetry.status];
}

/** @param {DashboardState} state */
export function connectionLabel(state) {
  if (state.cpu)
    return state.memoryTelemetry?.status === "ready"
      ? "CPU + Memory"
      : "CPU only";
  return state.source === "native" ? "Memory only" : "Not connected";
}
