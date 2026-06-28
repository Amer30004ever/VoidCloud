import { test, expect } from '@playwright/test';

const routeChecks = [
    { path: '/', text: /Void Cloud|production/i },
    { path: '/about', text: /About Void Cloud|Void Cloud/i },
    { path: '/blog', text: /Blog|Engineering notes/i },
    { path: '/careers', text: /Careers|platform/i },
    { path: '/docs', text: /Documentation|Guides|API reference/i },
    { path: '/dashboard', text: /Dashboard/i },
    { path: '/portal', text: /portal|Redirecting/i },
    { path: '/login', text: /Redirecting to AmerCloud login|AmerCloud/i },
    { path: '/amercloud', text: /Void Cloud|production|pricing/i },
    { path: '/amercloud/login', text: /Welcome back|Sign in to your Void Cloud account/i },
    { path: '/amercloud/register', text: /Create your account|verification/i },
    { path: '/amercloud/forgot-password', text: /Reset your password|reset link/i },
    { path: '/amercloud/reset-password', text: /Set a new password/i },
];

test('core marketing, auth, and portal routes render end to end', async ({ page }) => {
    for (const { path, text } of routeChecks) {
        await page.goto(path);
        await expect(page.locator('body')).toContainText(text);
    }
});

test('landing page navigation reaches sign-in and register flows', async ({ page }) => {
    await page.goto('/amercloud');

    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/amercloud\/login$/);

    await page.goBack();
    await page.getByRole('link', { name: 'Start free trial' }).first().click();
    await expect(page).toHaveURL(/\/amercloud\/register/);

    await page.goBack();
    await page.getByRole('link', { name: 'View pricing' }).click();
    await expect(page.locator('#pricing')).toBeVisible();
});

test('login form supports password reveal and reports failed submission', async ({ page }) => {
    let loginRequestCount = 0;

    await page.route('**/api/v1/auth/login', async (route) => {
        loginRequestCount += 1;
        const payload = route.request().postDataJSON();
        expect(payload).toEqual({ email: 'bad@example.com', password: 'bad' });

        await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Invalid credentials. Please try again.' }),
        });
    });

    await page.goto('/amercloud/login');

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('bad');
    await expect(passwordInput).toHaveValue('bad');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(page.locator('input[type="text"]').first()).toHaveValue('bad');

    await page.getByLabel('Email').fill('bad@example.com');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
    expect(loginRequestCount).toBe(1);
});
