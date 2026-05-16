# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login-page.spec.ts >> Login page >> renders email + password + submit and the EduSalone wordmark
- Location: e2e/login-page.spec.ts:12:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: getByLabel('Password')
Expected: visible
Error: strict mode violation: getByLabel('Password') resolved to 2 elements:
    1) <input id="password" type="password" name="password" placeholder="••••••••" class="h-9 w-full rounded border border-stroke bg-transparent px-3 pr-10 text-sm text-black placeholder:text-body outline-none transition focus:border-primary active:border-primary dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary "/> aka getByRole('textbox', { name: 'Password' })
    2) <button type="button" aria-label="Show password" class="absolute right-3 top-1/2 -translate-y-1/2 text-body hover:text-black dark:hover:text-white transition-colors">…</button> aka getByRole('button', { name: 'Show password' })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByLabel('Password')

```

```
Tearing down "context" exceeded the test timeout of 30000ms.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e7]
        - heading "EduSalone" [level=1] [ref=e11]
        - paragraph [ref=e12]: Welcome back — sign in to continue
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Email address
          - textbox "Email address" [ref=e15]:
            - /placeholder: you@example.com
        - generic [ref=e16]:
          - text: Password
          - generic [ref=e17]:
            - textbox "Password" [ref=e18]:
              - /placeholder: ••••••••
            - button "Show password" [ref=e19]:
              - img [ref=e20]
        - generic [ref=e23]:
          - generic [ref=e24]:
            - checkbox "Sign in as Super Admin" [ref=e25]
            - img [ref=e27]
          - text: Sign in as Super Admin
        - button "Sign in" [ref=e29]
      - paragraph [ref=e30]:
        - text: New institution?
        - link "Request admin access" [ref=e31] [cursor=pointer]:
          - /url: /admin-request
    - generic [ref=e33]:
      - generic [ref=e34]:
        - generic [ref=e35]: School Management Platform
        - heading "Manage your school smarter, not harder." [level=2] [ref=e36]:
          - text: Manage your school
          - text: smarter, not harder.
        - paragraph [ref=e38]: Everything your institution needs.
      - generic [ref=e39]:
        - generic [ref=e40]:
          - img [ref=e42]
          - generic [ref=e45]:
            - paragraph [ref=e46]: Student Management
            - paragraph [ref=e47]: Enroll, track and manage every student from admission to graduation.
        - generic [ref=e48]:
          - img [ref=e50]
          - generic [ref=e52]:
            - paragraph [ref=e53]: Results & Analytics
            - paragraph [ref=e54]: Publish grades, generate report cards and visualise performance trends.
        - generic [ref=e55]:
          - img [ref=e57]
          - generic [ref=e62]:
            - paragraph [ref=e63]: Staff & Lecturers
            - paragraph [ref=e64]: Manage lecturer profiles, class assignments and salary records.
        - generic [ref=e65]:
          - img [ref=e67]
          - generic [ref=e69]:
            - paragraph [ref=e70]: Assignments & Subjects
            - paragraph [ref=e71]: Create assignments, track submissions and organise subjects per class.
        - generic [ref=e72]:
          - img [ref=e74]
          - generic [ref=e77]:
            - paragraph [ref=e78]: Attendance Tracking
            - paragraph [ref=e79]: Mark daily attendance and receive automatic alerts for low attendance.
        - generic [ref=e80]:
          - img [ref=e82]
          - generic [ref=e84]:
            - paragraph [ref=e85]: Secure & Role-Based
            - paragraph [ref=e86]: Super admin, admin, lecturer and student roles with full access control.
      - generic [ref=e87]:
        - generic [ref=e88]:
          - paragraph [ref=e89]: 10k+
          - paragraph [ref=e90]: Students managed
        - generic [ref=e91]:
          - paragraph [ref=e92]: 500+
          - paragraph [ref=e93]: Institutions
        - generic [ref=e94]:
          - paragraph [ref=e95]: 99.9%
          - paragraph [ref=e96]: Uptime
  - region "Notifications alt+T"
```