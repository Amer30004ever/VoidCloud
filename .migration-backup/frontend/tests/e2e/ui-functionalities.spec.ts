import { test, expect } from '@playwright/test';

const routeChecks = [
    { path: '/', text: /Void Cloud|Start free trial|pricing/i },
    { path: '/about', text: /About Void Cloud/i },
    { path: '/blog', text: /Blog|Engineering notes/i },
    { path: '/careers', text: /Careers|Egypt deserves/i },
    { path: '/changelog', text: /Changelog/i },
    { path: '/docs', text: /Documentation|api\.voidcloud\.cc\.cd/i },
    { path: '/documentation', text: /Documentation|Create Document/i },
    { path: '/gdpr', text: /GDPR Compliance/i },
    { path: '/privacy', text: /Privacy/i },
    { path: '/terms', text: /Terms/i },
    { path: '/status', text: /status/i },
    { path: '/team', text: /team/i },
    { path: '/portfolio', text: /Portfolio/i },
    { path: '/portal', text: /Opening DevOps portal|Opening portal/i },
    { path: '/voidcloud', text: /Void Cloud|pricing/i },
    { path: '/voidcloud/login', text: /Welcome back|Sign in to your Void Cloud account/i },
    { path: '/voidcloud/register', text: /Create your account|verification/i },
    { path: '/voidcloud/forgot-password', text: /Reset your password|reset link/i },
    { path: '/voidcloud/reset-password', text: /Set a new password/i },
    { path: '/devops', text: /Amer Platform Portal|Sign in to your portal/i },
];

function expectedText(text: RegExp) {
    return new RegExp(`${text.source}|Redirecting to AmerCloud login|Redirecting to Amer Cloud login`, 'i');
}

test('public website and auth entry points render end to end', async ({ page }) => {
    for (const { path, text } of routeChecks) {
        await page.goto(path);
        await expect(page.locator('body')).toContainText(expectedText(text));
    }
});

test('landing page navigation reaches sign-in and register flows', async ({ page }) => {
    await page.goto('/voidcloud');

    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/voidcloud\/login$/);

    await page.goBack();
    await page.getByRole('link', { name: 'Start free trial' }).first().click();
    await expect(page).toHaveURL(/\/voidcloud\/register/);

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

    await page.goto('/voidcloud/login');

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
