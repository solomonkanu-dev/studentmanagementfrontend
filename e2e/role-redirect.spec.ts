import { test, expect } from "@playwright/test";

// Mocks /api/auth/login and /api/auth/me so the AuthContext sees a successful
// session, then asserts that each role lands on the right dashboard.
const ROLE_PATHS: Record<string, RegExp> = {
  admin: /\/admin/,
  lecturer: /\/lecturer/,
  student: /\/student/,
  parent: /\/parent/,
  super_admin: /\/super-admin/,
};

function setupAuthMocks(role: string) {
  return async ({ page }: { page: import("@playwright/test").Page }) => {
    const fakeUser = {
      _id: "u_1",
      fullName: "Test User",
      email: `${role}@example.com`,
      role,
      isActive: true,
    };
    const fakeToken = "header.eyJpZCI6InVfMSJ9.sig"; // not a real JWT — just a placeholder

    await page.route("**/api/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: fakeToken, user: fakeUser }),
      }),
    );
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: fakeToken }),
      }),
    );
    // The backend /auth/me used to refresh the user — return the same shape.
    await page.route("**/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(fakeUser),
      }),
    );
  };
}

for (const [role, pattern] of Object.entries(ROLE_PATHS)) {
  test(`${role} login redirects into ${pattern}`, async ({ page }) => {
    await setupAuthMocks(role)({ page });
    await page.goto("/login");
    await page.getByLabel("Email address").fill(`${role}@example.com`);
    await page.getByLabel("Password").fill("placeholder");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL(pattern, { timeout: 8000 });
    expect(page.url()).toMatch(pattern);
  });
}
