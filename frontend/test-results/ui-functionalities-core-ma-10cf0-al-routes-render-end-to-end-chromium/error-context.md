# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-functionalities.spec.ts >> core marketing, auth, and portal routes render end to end
- Location: tests\e2e\ui-functionalities.spec.ts:19:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('body')
Expected pattern: /Dashboard/i
Received string:  "☁Void CloudWelcome backSign in to your Void Cloud accountEmailPasswordRemember meForgot password?Sign inNew to Void Cloud? Create accountDidn't get the verification email? Resend"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('body')
    10 × locator resolved to <body class="geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable antialiased">…</body>
       - unexpected value ""
    - locator resolved to <body class="geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable antialiased">…</body>
    - unexpected value "Redirecting to AmerCloud login…"
    2 × locator resolved to <body class="geist_a71539c9-module__T19VSG__variable geist_mono_8d43a2aa-module__8Li5zG__variable antialiased">…</body>
      - unexpected value "☁Void CloudWelcome backSign in to your Void Cloud accountEmailPasswordRemember meForgot password?Sign inNew to Void Cloud? Create accountDidn't get the verification email? Resend"

```

```yaml
- link "☁ Void Cloud":
  - /url: /amercloud
- heading "Welcome back" [level=1]
- paragraph: Sign in to your Void Cloud account
- text: Email
- textbox "Email"
- text: Password
- textbox "Password Show password"
- button "Show password":
  - img
- checkbox "Remember me Forgot password?" [checked]
- text: Remember me
- link "Forgot password?":
  - /url: /amercloud/forgot-password
- button "Sign in"
- paragraph:
  - text: New to Void Cloud?
  - link "Create account":
    - /url: /amercloud/register
- paragraph:
  - text: Didn't get the verification email?
  - button "Resend"
- link "Chat on WhatsApp":
  - /url: https://wa.me/201061365444?text=Hi%20Void%20Cloud%20team%2C%20I%20have%20a%20question.
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const routeChecks = [
  4  |     { path: '/', text: /Void Cloud|production/i },
  5  |     { path: '/about', text: /About Void Cloud|Void Cloud/i },
  6  |     { path: '/blog', text: /Blog|Engineering notes/i },
  7  |     { path: '/careers', text: /Careers|platform/i },
  8  |     { path: '/docs', text: /Documentation|Guides|API reference/i },
  9  |     { path: '/dashboard', text: /Dashboard/i },
  10 |     { path: '/portal', text: /portal|Redirecting/i },
  11 |     { path: '/login', text: /Redirecting to AmerCloud login|AmerCloud/i },
  12 |     { path: '/amercloud', text: /Void Cloud|production|pricing/i },
  13 |     { path: '/amercloud/login', text: /Welcome back|Sign in to your Void Cloud account/i },
  14 |     { path: '/amercloud/register', text: /Create your account|verification/i },
  15 |     { path: '/amercloud/forgot-password', text: /Reset your password|reset link/i },
  16 |     { path: '/amercloud/reset-password', text: /Set a new password/i },
  17 | ];
  18 | 
  19 | test('core marketing, auth, and portal routes render end to end', async ({ page }) => {
  20 |     for (const { path, text } of routeChecks) {
  21 |         await page.goto(path);
> 22 |         await expect(page.locator('body')).toContainText(text);
     |                                            ^ Error: expect(locator).toContainText(expected) failed
  23 |     }
  24 | });
  25 | 
  26 | test('landing page navigation reaches sign-in and register flows', async ({ page }) => {
  27 |     await page.goto('/amercloud');
  28 | 
  29 |     await page.getByRole('link', { name: 'Sign in' }).click();
  30 |     await expect(page).toHaveURL(/\/amercloud\/login$/);
  31 | 
  32 |     await page.goBack();
  33 |     await page.getByRole('link', { name: 'Start free trial' }).first().click();
  34 |     await expect(page).toHaveURL(/\/amercloud\/register/);
  35 | 
  36 |     await page.goBack();
  37 |     await page.getByRole('link', { name: 'View pricing' }).click();
  38 |     await expect(page.locator('#pricing')).toBeVisible();
  39 | });
  40 | 
  41 | test('login form supports password reveal and reports failed submission', async ({ page }) => {
  42 |     let loginRequestCount = 0;
  43 | 
  44 |     await page.route('**/api/v1/auth/login', async (route) => {
  45 |         loginRequestCount += 1;
  46 |         const payload = route.request().postDataJSON();
  47 |         expect(payload).toEqual({ email: 'bad@example.com', password: 'bad' });
  48 | 
  49 |         await route.fulfill({
  50 |             status: 401,
  51 |             contentType: 'application/json',
  52 |             body: JSON.stringify({ message: 'Invalid credentials. Please try again.' }),
  53 |         });
  54 |     });
  55 | 
  56 |     await page.goto('/amercloud/login');
  57 | 
  58 |     const passwordInput = page.locator('input[type="password"]').first();
  59 |     await passwordInput.fill('bad');
  60 |     await expect(passwordInput).toHaveValue('bad');
  61 | 
  62 |     await page.getByRole('button', { name: /show password/i }).click();
  63 |     await expect(page.locator('input[type="text"]').first()).toHaveValue('bad');
  64 | 
  65 |     await page.getByLabel('Email').fill('bad@example.com');
  66 |     await page.getByRole('button', { name: /sign in/i }).click();
  67 | 
  68 |     await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  69 |     expect(loginRequestCount).toBe(1);
  70 | });
  71 | 
```