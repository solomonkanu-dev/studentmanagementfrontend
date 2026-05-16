# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-validation.spec.ts >> Login validation >> surfaces server error message on failed login
- Location: e2e/login-validation.spec.ts:31:7

# Error details

```
Error: locator.fill: Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
    1) <input id="password" type="password" name="password" placeholder="••••••••" class="h-9 w-full rounded border border-stroke bg-transparent px-3 pr-10 text-sm text-black placeholder:text-body outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary "/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-label="Show password" class="absolute right-3 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white transition-colors">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - waiting for getByLabel('Password')

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - textbox "Email address" [active] [ref=e17]:
            - /placeholder: you@example.com
            - text: nobody@example.com
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
  3  | test.describe("Login validation", () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.route("**/api/auth/me", (route) =>
  6  |       route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
  7  |     );
  8  |   });
  9  | 
  10 |   test("does not call the API for blank or malformed email", async ({ page }) => {
  11 |     let loginCalls = 0;
  12 |     await page.route("**/api/auth/login", (route) => {
  13 |       loginCalls++;
  14 |       route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Invalid" }) });
  15 |     });
  16 | 
  17 |     await page.goto("/login");
  18 |     await page.getByRole("button", { name: /sign in/i }).click();
  19 |     // Either HTML5 validation or RHF stops the submission — what matters is
  20 |     // no /api/auth/login request fires.
  21 |     await page.waitForTimeout(300);
  22 |     expect(loginCalls).toBe(0);
  23 | 
  24 |     await page.getByLabel("Email address").fill("not-an-email");
  25 |     await page.getByLabel("Password").fill("anything");
  26 |     await page.getByRole("button", { name: /sign in/i }).click();
  27 |     await page.waitForTimeout(300);
  28 |     expect(loginCalls).toBe(0);
  29 |   });
  30 | 
  31 |   test("surfaces server error message on failed login", async ({ page }) => {
  32 |     await page.route("**/api/auth/login", (route) =>
  33 |       route.fulfill({
  34 |         status: 401,
  35 |         contentType: "application/json",
  36 |         body: JSON.stringify({ error: "Invalid credentials" }),
  37 |       }),
  38 |     );
  39 | 
  40 |     await page.goto("/login");
  41 |     await page.getByLabel("Email address").fill("nobody@example.com");
> 42 |     await page.getByLabel("Password").fill("wrongpassword");
     |                                       ^ Error: locator.fill: Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
  43 |     await page.getByRole("button", { name: /sign in/i }).click();
  44 | 
  45 |     await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 4000 });
  46 |   });
  47 | });
  48 | 
```