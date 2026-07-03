import { expect, type Page } from '@playwright/test';
import { E2E_USER } from '../globalSetup';

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(E2E_USER.email);
  await page.getByLabel('Senha').fill(E2E_USER.password);

  const submit = page.getByRole('button', { name: /^Entrar$/i });
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(E2E_USER.name)).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /menu do usu[aá]rio|e2e user/i }).click();
  await page.getByRole('menuitem', { name: /sair/i }).click();
  await expect(page).toHaveURL(/\/login/);
}
