import { test, expect } from '@playwright/test';

test.describe('認証フロー', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/CDCP|ログイン|Login/i);
  });

  test('Auth0 ログインボタンが存在する', async ({ page }) => {
    await page.goto('/login');
    const loginButton = page.getByRole('button', { name: /ログイン|Login|Sign in/i });
    await expect(loginButton).toBeVisible();
  });

  test('未認証でプロジェクト一覧にアクセスすると /login にリダイレクト', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login/);
  });
});
