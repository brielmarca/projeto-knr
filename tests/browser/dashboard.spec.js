import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("keyboard controls, search, mode and sample analysis work without changing the system", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Advanced", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Advanced", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox");
  await expect(search).toBeFocused();
  await search.fill("cache");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Clean Temporary & Shader Cache" })
    .click();
  await expect(page.locator("#tools")).toBeFocused();
  await page
    .getByRole("button", { name: "Analyze my PC", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sample review ready" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Review cache", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Apply optimization" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Review cache", exact: true }),
  ).toBeFocused();
});

test("production never presents sample telemetry, even with a mock query parameter", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/?mock=true");
  await expect(page.locator("#app")).toHaveAttribute(
    "data-source",
    "unavailable",
  );
  await expect(page.getByText("Ryzen 7 7800X3D")).toHaveCount(0);
  await expect(page.getByText("+12.4%", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Windows telemetry · Not connected"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Analyze my PC", exact: true })
    .click();
  await expect(page.locator("#analysis-feedback")).toHaveText(
    "Windows engine not connected. Connect the engine and try again.",
  );
  await expect(
    page.getByRole("button", { name: "Analyze my PC", exact: true }),
  ).toBeEnabled();
});

for (const [width, height] of [
  [1440, 900],
  [1920, 1080],
  [1366, 768],
  [1280, 720],
]) {
  test(`desktop ${width}x${height}: layout and accessibility`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const header = await page.locator(".topbar").boundingBox();
    expect(header?.height).toBe(64);
    const core = await page.locator(".orb-core").boundingBox();
    const storage = await page.locator(".orb-storage").boundingBox();
    expect(storage.x + storage.width).toBeLessThan(core.x);
    for (const link of await page
      .getByRole("navigation")
      .getByRole("link")
      .all()) {
      const box = await link.boundingBox();
      expect(box?.height).toBeLessThan(45);
    }
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${width}.png`),
      fullPage: true,
    });
  });
}

test("search escapes input, returns empty state, and dialog is keyboard accessible", async ({
  page,
}) => {
  await page.goto("/");
  const trigger = page.getByRole("button", {
    name: "Search modules (Control K)",
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("searchbox").fill("<img src=x onerror=alert(1)>");
  await expect(
    page.getByText("No matching modules. Try “cache” or “power”."),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
