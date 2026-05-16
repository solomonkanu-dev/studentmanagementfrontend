import { test, expect } from "@playwright/test";

test.describe("Login validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
    );
  });

  test("does not call the API for blank or malformed email", async ({ page }) => {
    let loginCalls = 0;
    await page.route("**/api/auth/login", (route) => {
      loginCalls++;
      route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Invalid" }) });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();
    // Either HTML5 validation or RHF stops the submission — what matters is
    // no /api/auth/login request fires.
    await page.waitForTimeout(300);
    expect(loginCalls).toBe(0);

    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByLabel("Password").fill("anything");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(300);
    expect(loginCalls).toBe(0);
  });

  test("surfaces server error message on failed login", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Invalid credentials" }),
      }),
    );

    await page.goto("/login");
    await page.getByLabel("Email address").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 4000 });
  });
});
