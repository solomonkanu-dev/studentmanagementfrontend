import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    // Avoid the AuthProvider hitting /api/auth/me on mount — keeps the test
    // independent of a running backend.
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
    );
  });

  test("renders email + password + submit and the EduSalone wordmark", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /edu(salone)?/i })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("submit is keyboard-reachable and password input is type=password", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
    await page.keyboard.press("Tab");
    // After enough Tab presses, focus should land on the submit button.
    // Don't assert an exact stop count — UAs sometimes inject extras (e.g. password reveal).
    let attempts = 0;
    while (attempts < 12) {
      const active = await page.evaluate(() => document.activeElement?.tagName);
      if (active === "BUTTON") break;
      await page.keyboard.press("Tab");
      attempts++;
    }
    expect(attempts).toBeLessThan(12);
  });
});
