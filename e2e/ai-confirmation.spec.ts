import { test, expect, type Page } from "@playwright/test";

/**
 * Exercises the AI write-action confirmation round-trip in the admin chat
 * widget. `/api/ai/admin-chat` is mocked: the first turn returns a
 * `needs_confirmation` card, the confirmation turn returns `complete`.
 * Runs without a live backend.
 */

const fakeUser = {
  _id: "u_1",
  fullName: "Test Admin",
  email: "admin@example.com",
  role: "admin",
  isActive: true,
};
const fakeToken = "header.eyJpZCI6InVfMSJ9.sig";

async function setupMocks(page: Page) {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: fakeToken, user: fakeUser }),
    })
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: fakeToken }),
    })
  );
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(fakeUser),
    })
  );

  // Keep the proactive insights panel quiet.
  await page.route("**/api/ai/admin-insights**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        insights: [],
        generatedAt: new Date().toISOString(),
        cached: true,
      }),
    })
  );

  // Admin chat: first turn → confirmation card; confirmation turn → complete.
  await page.route("**/api/ai/admin-chat", (route) => {
    const body = route.request().postDataJSON() as {
      confirmation?: unknown;
    };
    if (body?.confirmation) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "complete",
          reply: "Done — your announcement has been posted.",
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "needs_confirmation",
        pendingAction: "fake-blob",
        signature: "fake-sig",
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        assistantPreamble: "I'll post this announcement for you.",
        card: {
          toolName: "post_announcement",
          title: "Post announcement",
          description: "This will publish an announcement to your institution.",
          fields: [
            { label: "Title", value: "Mid-term break" },
            { label: "Message", value: "School is closed on Friday." },
            { label: "Audience", value: "Everyone" },
          ],
          warning: "Everyone in the selected audience will see this.",
          confirmLabel: "Post announcement",
        },
      }),
    });
  });
}

test("admin chat surfaces a confirmation card and completes on approval", async ({
  page,
}) => {
  await setupMocks(page);

  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("placeholder");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 8000 });

  // Open the admin assistant and ask it to post an announcement.
  await page.getByRole("button", { name: "Open admin assistant" }).click();
  const input = page.getByLabel("Chat input");
  await input.fill("Announce that school is closed on Friday");
  await page.getByRole("button", { name: "Send message" }).click();

  // The confirmation card should appear — and nothing is posted yet.
  await expect(page.getByText("This will publish an announcement")).toBeVisible({
    timeout: 8000,
  });
  const confirmButton = page.getByRole("button", {
    name: "Post announcement",
  });
  await expect(confirmButton).toBeVisible();

  // Approve it — the assistant should confirm completion.
  await confirmButton.click();
  await expect(
    page.getByText("Done — your announcement has been posted.")
  ).toBeVisible({ timeout: 8000 });
});

test("admin chat confirmation card can be cancelled", async ({ page }) => {
  await setupMocks(page);

  await page.goto("/login");
  await page.getByLabel("Email address").fill("admin@example.com");
  await page.getByRole("textbox", { name: "Password" }).fill("placeholder");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/admin/, { timeout: 8000 });

  await page.getByRole("button", { name: "Open admin assistant" }).click();
  await page.getByLabel("Chat input").fill("Post an announcement");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(
    page.getByRole("button", { name: "Post announcement" })
  ).toBeVisible({ timeout: 8000 });

  // Cancelling marks the card resolved without completing the action.
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("Cancelled")).toBeVisible({ timeout: 8000 });
});
