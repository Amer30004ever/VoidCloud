import { test, expect } from '@playwright/test';

test('public landing page and auth entry points render', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toContainText('Void Cloud');

    await page.goto('/amercloud/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    await page.goto('/amercloud/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
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

test('auth helper pages render', async ({ page }) => {
    await page.goto('/amercloud/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

    await page.goto('/amercloud/reset-password');
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible();
});
