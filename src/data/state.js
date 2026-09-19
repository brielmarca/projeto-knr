/** @typedef {{label: string, name: string, value: string, detail: string, percent: number | null}} HardwareMetric */
/** @typedef {{source: 'unavailable' | 'mock', hardware: HardwareMetric[], impacts: string[], audit: string, findings: string, restore: string, results: string[]}} DashboardState */

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
