# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-functionalities.spec.ts >> login form supports password reveal and reports failed submission
- Location: tests\e2e\ui-functionalities.spec.ts:52:5

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/amercloud/login
Call log:
  - navigating to "http://127.0.0.1:3000/amercloud/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const routeChecks = [
  4  |     { path: '/', text: /Void Cloud|Start free trial|pricing/i },
  5  |     { path: '/about', text: /About Void Cloud/i },
  6  |     { path: '/blog', text: /Blog|Engineering notes/i },
  7  |     { path: '/careers', text: /Careers|Egypt deserves/i },
  8  |     { path: '/changelog', text: /Changelog/i },
  9  |     { path: '/docs', text: /Documentation|api\.voidcloud\.cc\.cd/i },
  10 |     { path: '/documentation', text: /Documentation|Create Document/i },
  11 |     { path: '/gdpr', text: /GDPR Compliance/i },
  12 |     { path: '/privacy', text: /Privacy/i },
  13 |     { path: '/terms', text: /Terms/i },
  14 |     { path: '/status', text: /status/i },
  15 |     { path: '/team', text: /team/i },
  16 |     { path: '/portfolio', text: /Portfolio/i },
  17 |     { path: '/portal', text: /Opening DevOps portal|Opening portal/i },
  18 |     { path: '/amercloud', text: /Void Cloud|pricing/i },
  19 |     { path: '/amercloud/login', text: /Welcome back|Sign in to your Void Cloud account/i },
  20 |     { path: '/amercloud/register', text: /Create your account|verification/i },
  21 |     { path: '/amercloud/forgot-password', text: /Reset your password|reset link/i },
  22 |     { path: '/amercloud/reset-password', text: /Set a new password/i },
  23 |     { path: '/devops', text: /Amer Platform Portal|Sign in to your portal/i },
  24 | ];
  25 | 
  26 | function expectedText(text: RegExp) {
  27 |     return new RegExp(`${text.source}|Redirecting to AmerCloud login|Redirecting to Amer Cloud login`, 'i');
  28 | }
  29 | 
  30 | test('public website and auth entry points render end to end', async ({ page }) => {
  31 |     for (const { path, text } of routeChecks) {
  32 |         await page.goto(path);
  33 |         await expect(page.locator('body')).toContainText(expectedText(text));
  34 |     }
  35 | });
  36 | 
  37 | test('landing page navigation reaches sign-in and register flows', async ({ page }) => {
  38 |     await page.goto('/amercloud');
  39 | 
  40 |     await page.getByRole('link', { name: 'Sign in' }).click();
  41 |     await expect(page).toHaveURL(/\/amercloud\/login$/);
  42 | 
  43 |     await page.goBack();
  44 |     await page.getByRole('link', { name: 'Start free trial' }).first().click();
  45 |     await expect(page).toHaveURL(/\/amercloud\/register/);
  46 | 
  47 |     await page.goBack();
  48 |     await page.getByRole('link', { name: 'View pricing' }).click();
  49 |     await expect(page.locator('#pricing')).toBeVisible();
  50 | });
  51 | 
  52 | test('login form supports password reveal and reports failed submission', async ({ page }) => {
  53 |     let loginRequestCount = 0;
  54 | 
  55 |     await page.route('**/api/v1/auth/login', async (route) => {
  56 |         loginRequestCount += 1;
  57 |         const payload = route.request().postDataJSON();
  58 |         expect(payload).toEqual({ email: 'bad@example.com', password: 'bad' });
  59 | 
  60 |         await route.fulfill({
  61 |             status: 401,
  62 |             contentType: 'application/json',
  63 |             body: JSON.stringify({ message: 'Invalid credentials. Please try again.' }),
  64 |         });
  65 |     });
  66 | 
> 67 |     await page.goto('/amercloud/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/amercloud/login
  68 | 
  69 |     const passwordInput = page.locator('input[type="password"]').first();
  70 |     await passwordInput.fill('bad');
  71 |     await expect(passwordInput).toHaveValue('bad');
  72 | 
  73 |     await page.getByRole('button', { name: /show password/i }).click();
  74 |     await expect(page.locator('input[type="text"]').first()).toHaveValue('bad');
  75 | 
  76 |     await page.getByLabel('Email').fill('bad@example.com');
  77 |     await page.getByRole('button', { name: /sign in/i }).click();
  78 | 
  79 |     await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  80 |     expect(loginRequestCount).toBe(1);
  81 | });
  82 | 
```