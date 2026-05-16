# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-page.spec.ts >> Login page >> submit is keyboard-reachable and password input is type=password
- Location: e2e/login-page.spec.ts:20:7

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByLabel('Password')
Expected: "password"
Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
    1) <input id="password" type="password" name="password" placeholder="••••••••" class="h-9 w-full rounded border border-stroke bg-transparent px-3 pr-10 text-sm text-black placeholder:text-body outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary "/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-label="Show password" class="absolute right-3 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white transition-colors">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByLabel('Password')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e7]
        - heading "Edu Salone" [level=1] [ref=e11]:
          - text: Edu
          - generic [ref=e12]: Salone
        - paragraph [ref=e13]: Welcome back — sign in to continue
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Email address
          - textbox "Email address" [ref=e17]:
            - /placeholder: you@example.com
        - generic [ref=e18]:
          - generic [ref=e19]: Password
          - generic [ref=e20]:
            - textbox "Password" [ref=e21]:
              - /placeholder: ••••••••
            - button "Show password" [ref=e22]:
              - img [ref=e23]
        - generic [ref=e26] [cursor=pointer]:
          - checkbox "Sign in as Super Admin" [ref=e28]
          - text: Sign in as Super Admin
        - button "Sign in" [ref=e30]
      - paragraph [ref=e31]:
        - text: New institution?
        - link "Request admin access" [ref=e32] [cursor=pointer]:
          - /url: /admin-request
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]: School Management Platform
        - heading "Manage your school smarter, not harder." [level=2] [ref=e42]:
          - text: Manage your school
          - text: smarter, not harder.
        - paragraph [ref=e44]: From enrolment to graduation.
      - generic [ref=e45]:
        - generic [ref=e46]:
          - img [ref=e48]
          - generic [ref=e51]:
            - paragraph [ref=e52]: Student Management
            - paragraph [ref=e53]: Enroll, track and manage every student from admission to graduation.
        - generic [ref=e54]:
          - img [ref=e56]
          - generic [ref=e58]:
            - paragraph [ref=e59]: Results & Analytics
            - paragraph [ref=e60]: Publish grades, generate report cards and visualise performance trends.
        - generic [ref=e61]:
          - img [ref=e63]
          - generic [ref=e68]:
            - paragraph [ref=e69]: Staff & Lecturers
            - paragraph [ref=e70]: Manage lecturer profiles, class assignments and salary records.
        - generic [ref=e71]:
          - img [ref=e73]
          - generic [ref=e75]:
            - paragraph [ref=e76]: Assignments & Subjects
            - paragraph [ref=e77]: Create assignments, track submissions and organise subjects per class.
        - generic [ref=e78]:
          - img [ref=e80]
          - generic [ref=e83]:
            - paragraph [ref=e84]: Attendance Tracking
            - paragraph [ref=e85]: Mark daily attendance and receive automatic alerts for low attendance.
        - generic [ref=e86]:
          - img [ref=e88]
          - generic [ref=e90]:
            - paragraph [ref=e91]: Secure & Role-Based
            - paragraph [ref=e92]: Super admin, admin, lecturer and student roles with full access control.
      - generic [ref=e93]:
        - generic [ref=e94]:
          - paragraph [ref=e95]: 10k+
          - paragraph [ref=e96]: Students managed
        - generic [ref=e97]:
          - paragraph [ref=e98]: 500+
          - paragraph [ref=e99]: Institutions
        - generic [ref=e100]:
          - paragraph [ref=e101]: 99.9%
          - paragraph [ref=e102]: Uptime
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e108] [cursor=pointer]:
    - img [ref=e109]
  - alert [ref=e112]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Login page", () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Avoid the AuthProvider hitting /api/auth/me on mount — keeps the test
  6  |     // independent of a running backend.
  7  |     await page.route("**/api/auth/me", (route) =>
  8  |       route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
  9  |     );
  10 |   });
  11 | 
  12 |   test("renders email + password + submit and the EduSalone wordmark", async ({ page }) => {
  13 |     await page.goto("/login");
  14 |     await expect(page.getByRole("heading", { name: /edu(salone)?/i })).toBeVisible();
  15 |     await expect(page.getByLabel("Email address")).toBeVisible();
  16 |     await expect(page.getByLabel("Password")).toBeVisible();
  17 |     await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  18 |   });
  19 | 
  20 |   test("submit is keyboard-reachable and password input is type=password", async ({ page }) => {
  21 |     await page.goto("/login");
> 22 |     await expect(page.getByLabel("Password")).toHaveAttribute("type", "password");
     |                                               ^ Error: expect(locator).toHaveAttribute(expected) failed
  23 |     await page.keyboard.press("Tab");
  24 |     // After enough Tab presses, focus should land on the submit button.
  25 |     // Don't assert an exact stop count — UAs sometimes inject extras (e.g. password reveal).
  26 |     let attempts = 0;
  27 |     while (attempts < 12) {
  28 |       const active = await page.evaluate(() => document.activeElement?.tagName);
  29 |       if (active === "BUTTON") break;
  30 |       await page.keyboard.press("Tab");
  31 |       attempts++;
  32 |     }
  33 |     expect(attempts).toBeLessThan(12);
  34 |   });
  35 | });
  36 | 
```