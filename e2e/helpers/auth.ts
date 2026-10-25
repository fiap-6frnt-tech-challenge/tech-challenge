import { expect, type Page } from '@playwright/test';
import { E2E_USER, type E2EUser } from '../globalSetup';

export async function login(page: Page, user: E2EUser = E2E_USER) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Senha').fill(user.password);

  const submit = page.getByRole('button', { name: /^Entrar$/i });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/$/);
  // The profile is hidden by the responsive header on mobile.
  await expect(page.getByText(user.name)).toBeAttached();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /menu do usu[aá]rio|e2e user/i }).click();
  await page.getByRole('menuitem', { name: /^sair$/i }).click();
  await expect(page).toHaveURL(/\/login/);
}
