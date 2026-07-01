import { test, expect } from '@playwright/test';

test('login page renders and login submission hits the API endpoint', async ({ page }) => {
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

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByText('Sign in to your Void Cloud account')).toBeVisible();

    await page.getByLabel('Email').fill('bad@example.com');
    await page.locator('input[type="password"]').first().fill('bad');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
    expect(loginRequestCount).toBe(1);
});

test('auth helper pages render', async ({ page }) => {
    await page.goto('/voidcloud/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    await page.goto('/voidcloud/forgot-password');
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();

    await page.goto('/voidcloud/reset-password');
    await expect(page.getByRole('heading', { name: 'Set a new password' })).toBeVisible();
});
