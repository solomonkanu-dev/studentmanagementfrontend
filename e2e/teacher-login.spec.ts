import { test, expect } from "@playwright/test";

test("teacher login redirects to lecturer dashboard", async ({ page }) => {
  await page.goto("/login");

  // Fill credentials
  await page.getByLabel("Email address").fill("mariama@gmail.com");
  await page.getByLabel("Password").fill("mariama@232");

  // Submit
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for navigation — teacher role redirects to /lecturer
  await page.waitForURL(/\/lecturer/, { timeout: 10000 });

  // Confirm we're on the lecturer dashboard, not super-admin
  expect(page.url()).toContain("/lecturer");
  await expect(page.getByText(/super.admin/i)).not.toBeVisible();
});
