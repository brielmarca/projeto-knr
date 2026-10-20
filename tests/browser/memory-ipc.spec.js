import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";

const snapshot = JSON.parse(
  readFileSync(
    new URL("../../contracts/fixtures/memory-snapshot.json", import.meta.url),
    "utf8",
  ),
);

// Test-only transport stub: exercises the real adapter and renderer, not native Windows.
async function stubIpc(
  page,
  { response = snapshot, error = null, deferred = false } = {},
) {
  await page.addInitScript(
    ({ response, error, deferred }) => {
      window.isTauri = true;
      window.ipcCalls = [];
      window.__TAURI_INTERNALS__ = {
        invoke: (command) => {
          window.ipcCalls.push(command);
          return new Promise((resolve, reject) => {
            window.finishMemory = () =>
              error ? reject(error) : resolve(response);
            if (!deferred) window.finishMemory();
          });
        },
      };
    },
    { response, error, deferred },
  );
}

for (const url of ["/", "http://127.0.0.1:4173/code.html"]) {
  for (const vramBytes of [null, 12884901888]) {
    test(`Single GPU capacity remains readable at 1280px (${vramBytes}): ${url}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await stubIpc(page, {
        response: {
          ...snapshot,
          gpus: [
            {
              name: "Long adapter name ".repeat(7),
              manufacturer: null,
              vramBytes,
            },
          ],
        },
      });
      await page.goto(url);
      const gpu = page.getByRole("article", {
        name: "GPU snapshot",
        exact: true,
      });
      await expect(gpu).toContainText(
        vramBytes === null ? "VRAM unavailable" : "12.0 GiB VRAM",
      );
      await expect(gpu.getByRole("meter")).toHaveCount(0);
      expect(
        await gpu.evaluate((card) => card.scrollWidth <= card.clientWidth),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    });
  }
  test(`GPU identities and nullable VRAM render without usage claims: ${url}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const response = JSON.parse(
      readFileSync(
        new URL("../../contracts/fixtures/gpu-snapshot.json", import.meta.url),
        "utf8",
      ),
    );
    response.gpus[1].name = "Integrated <GPU>";
    await stubIpc(page, { response });
    await page.goto(url);
    const gpu = page.getByRole("article", {
      name: "GPU snapshot",
      exact: true,
    });
    await expect(gpu).toContainText("2 hardware adapters");
    await expect(gpu.getByRole("meter")).toHaveCount(0);
    await expect(page.locator("#telemetry-status")).toHaveText(
      "Native snapshot · GPU only",
    );
    await page
      .getByRole("button", { name: "View system connection status" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(
      "Test GPU · Manufacturer: NVIDIA · Dedicated VRAM: 12.0 GiB",
    );
    await expect(dialog).toContainText(
      "Integrated <GPU> · Manufacturer: Intel · Dedicated VRAM: Unavailable",
    );
    await expect(dialog).toContainText("not usage or shared system memory");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Close dialog" }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });

  test(`System-drive free space renders through startup IPC: ${url}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const response = JSON.parse(
      readFileSync(
        new URL(
          "../../contracts/fixtures/system-snapshot.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    response.storage.volume = "D:";
    await stubIpc(page, { response });
    await page.goto(url);
    const storage = page.getByRole("article", {
      name: "Storage snapshot",
      exact: true,
    });
    await expect(storage).toContainText("System drive D:");
    await expect(storage).toContainText("25% free");
    await expect(storage).toContainText("128.0 / 512.0 GiB");
    await expect(
      storage.getByRole("meter", { name: "Storage free space at collection" }),
    ).toHaveAttribute("value", "25");
    await expect(page.locator("#telemetry-status")).toHaveText(
      "Native snapshot · CPU + Memory + Storage",
    );
    for (const label of ["GPU", "Network"]) {
      await expect(
        page.getByRole("article", {
          name: `${label} unavailable`,
          exact: true,
        }),
      ).toContainText("—");
    }
    expect(
      await storage.evaluate(
        (card) =>
          card.querySelector(".metric-detail").getBoundingClientRect().right <=
          card.getBoundingClientRect().right,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "View system connection status" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "384.0 GiB used, 512.0 GiB total",
    );
    await expect(page.getByRole("dialog")).toContainText(
      "Windows quotas apply",
    );
    await expect(page.getByRole("dialog")).toContainText("not live monitoring");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Review cache", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Apply optimization" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Close dialog" }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test(`CPU sample renders through startup IPC: ${url}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const response = JSON.parse(
      readFileSync(
        new URL(
          "../../contracts/fixtures/cpu-memory-snapshot.json",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    response.cpu.model =
      'Test <img src=x onerror="window.cpuInjected=true"> CPU';
    await stubIpc(page, { response });
    await page.goto(url);
    const cpu = page.getByRole("article", {
      name: "CPU snapshot",
      exact: true,
    });
    await expect(cpu).toContainText(response.cpu.model);
    await expect(cpu).toContainText("8C / 16T · 251 ms");
    await expect(cpu.getByRole("meter")).toHaveAttribute("value", "25.125");
    await expect(cpu.locator("img")).toHaveCount(0);
    expect(
      await cpu.evaluate((card) => {
        const detail = card
          .querySelector(".metric-detail")
          .getBoundingClientRect();
        return detail.right <= card.getBoundingClientRect().right;
      }),
    ).toBe(true);
    await expect(page.locator("#telemetry-status")).toHaveText(
      "Native snapshot · CPU + Memory",
    );
    for (const label of ["GPU", "Storage", "Network"]) {
      await expect(
        page.getByRole("article", {
          name: `${label} unavailable`,
          exact: true,
        }),
      ).toContainText("—");
    }
    await page
      .getByRole("button", { name: "View system connection status" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "CPU usage averaged over 251 ms",
    );
    await expect(page.getByRole("dialog")).toContainText("not live monitoring");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test(`Tauri memory overrides dev fixtures and leaves diagnostics disconnected: ${url}`, async ({
    page,
  }) => {
    await stubIpc(page);
    await page.goto(url);
    await expect(page.locator("#app")).toHaveAttribute("data-source", "native");
    const memory = page.getByRole("article", {
      name: "Memory snapshot",
      exact: true,
    });
    await expect(memory).toContainText("Physical memory");
    await expect(memory).toContainText("12.0 / 16.0 GiB");
    await expect(memory.getByRole("meter")).toHaveAttribute("value", "75");
    await expect(page.getByText("Ryzen 7 7800X3D")).toHaveCount(0);
    await expect(
      page.getByRole("article", { name: "CPU unavailable", exact: true }),
    ).toContainText("—");
    await page
      .getByRole("button", { name: "View system connection status" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(snapshot.collectedAt);
    await expect(page.getByRole("dialog")).toContainText("not live monitoring");
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("button", { name: "Analyze my PC", exact: true })
      .click();
    await expect(page.locator("#analysis-feedback")).toContainText(
      "Windows engine not connected",
    );
    await page
      .getByRole("button", { name: "Review cache", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Apply optimization" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Close dialog" }).click();
    expect(await page.evaluate(() => window.ipcCalls)).toEqual([
      "collect_system_snapshot",
    ]);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test("pending memory does not block interactions or reset focus/mode when it arrives", async ({
  page,
}) => {
  await stubIpc(page, { deferred: true });
  await page.goto("/");
  await expect(page.locator("#telemetry-status")).toHaveText(
    "System snapshot · Loading",
  );
  const advanced = page.getByRole("button", { name: "Advanced", exact: true });
  await advanced.click();
  await page.evaluate(() => window.finishMemory());
  await expect(page.locator("#app")).toHaveAttribute("data-source", "native");
  await expect(advanced).toBeFocused();
  await expect(advanced).toHaveAttribute("aria-pressed", "true");
});

test("connection dialog opened during collection updates without moving focus", async ({
  page,
}) => {
  await stubIpc(page, { deferred: true });
  await page.goto("/");
  await page
    .getByRole("button", { name: "View system connection status" })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Reading physical memory",
  );
  await page.evaluate(() => window.finishMemory());
  await expect(page.getByRole("dialog")).toContainText(snapshot.collectedAt);
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
});

for (const [name, options, status, message] of [
  [
    "GPU collection failure",
    { error: { code: "GPU_API", hresult: -1 } },
    "Error",
    "Windows could not read GPU information.",
  ],
  [
    "storage collection failure",
    { error: { code: "STORAGE_WINDOWS_API", win32Code: 5 } },
    "Error",
    "Windows could not read system-drive storage.",
  ],
  [
    "unsupported platform",
    { error: { code: "UNSUPPORTED_PLATFORM" } },
    "Unavailable",
    "System telemetry collection requires Windows.",
  ],
  [
    "native failure",
    { error: { code: "WINDOWS_API", win32Code: 5 } },
    "Error",
    "Windows could not read physical memory.",
  ],
  [
    "invalid snapshot",
    { response: { ...snapshot, schemaVersion: 2 } },
    "Error",
    "The native snapshot failed validation.",
  ],
  [
    "missing memory",
    { response: { ...snapshot, memory: null } },
    "Unavailable",
    "The native snapshot contains no memory measurement.",
  ],
]) {
  test(`Tauri ${name} shows explicit unavailability, never dev fixtures`, async ({
    page,
  }) => {
    await stubIpc(page, options);
    await page.goto("/");
    await expect(page.locator("#telemetry-status")).toHaveText(
      `System snapshot · ${status}`,
    );
    await expect(page.locator("#app")).toHaveAttribute(
      "data-source",
      "unavailable",
    );
    await expect(
      page.getByRole("article", { name: "Memory unavailable", exact: true }),
    ).toContainText("—");
    await expect(page.getByRole("meter")).toHaveCount(0);
    await expect(page.getByText("DDR5-6000 Pool")).toHaveCount(0);
    await page
      .getByRole("button", { name: "View system connection status" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(message);
  });
}
