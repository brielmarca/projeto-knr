/** Stitch fixtures only. Imported exclusively inside the Vite development branch. */
/** @type {import('./state.js').DashboardState} */
export const mockState = {
  source: "mock",
  hardware: [
    {
      label: "CPU",
      name: "Ryzen 7 7800X3D",
      value: "18%",
      detail: "48°C",
      percent: 18,
    },
    {
      label: "GPU",
      name: "RTX 4080 SUPER",
      value: "8%",
      detail: "42°C",
      percent: 8,
    },
    {
      label: "Memory",
      name: "DDR5-6000 Pool",
      value: "35%",
      detail: "11.4 / 32 GB",
      percent: 35,
    },
    {
      label: "Storage",
      name: "Samsung 990 PRO",
      value: "842 GB",
      detail: "99% health",
      percent: 58,
    },
    {
      label: "Network",
      name: "Intel I226-V",
      value: "4.2 MB/s",
      detail: "8 ms",
      percent: 22,
    },
  ],
  impacts: ["+12.4%", "1.84 GB", "−380 MB"],
  audit: "Sample · 11:24 AM",
  findings: "14 items · 4 subsystems",
  restore: "Sample restore point",
  results: [
    "1.84 GB reclaimable",
    "7 services to review",
    "0.5 ms timer",
    "V-Cache affinity",
  ],
};
