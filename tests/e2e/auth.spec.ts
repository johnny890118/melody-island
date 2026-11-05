import { expect, test, type Locator, type Page } from '@playwright/test';

async function openLogin(page: Page, button: Locator) {
  const [popup] = await Promise.all([page.waitForEvent('popup'), button.click()]);
  await popup.waitForURL(
    (url) => url.origin === 'http://127.0.0.1:9099' && url.pathname === '/emulator/auth/handler',
  );
  return popup;
}

test('Google emulator sign-in can cancel, retry, persist on reload and sign out', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const login = page.getByRole('button', { name: '登入', exact: true });
  const create = page.getByRole('button', { name: '登入並建立島嶼' });
  const abandoned = await openLogin(page, login);
  await expect(create).toBeDisabled();
  await abandoned.close();
  await expect(page.getByText('已取消登入，可以再試一次。')).toBeVisible({ timeout: 15000 });
  await expect(login).toBeEnabled();

  const popup = await openLogin(page, create);
  await popup.getByText('Add new account', { exact: true }).click();
  await popup.getByText('Auto-generate user information', { exact: true }).click();
  await popup.getByRole('button', { name: 'Sign in with Google.com' }).click();
  const logout = page.getByRole('button', { name: '登出' });
  await expect(logout).toBeEnabled({ timeout: 20000 });
  await expect(page.getByRole('button', { name: '建立島嶼', exact: true })).toBeEnabled();
  await page.reload();
  await expect(logout).toBeEnabled();
  await logout.click();
  await expect(login).toBeEnabled();
});

test.describe('redirect flow', () => {
  test.use({ isMobile: true, hasTouch: true });
  test('same-tab Google sign-in returns, persists and signs out on a phone-sized browser', async ({ page }) => {
    test.skip(process.env.MELODY_TEST_AUTH_REDIRECT !== 'true', 'Requires the redirect build configuration.');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: '登入', exact: true }).click();
    await page.waitForURL(
      (url) => url.origin === 'http://127.0.0.1:3100' && url.pathname === '/emulator/auth/handler',
    );
    await page.getByText('Add new account', { exact: true }).click();
    await page.getByText('Auto-generate user information', { exact: true }).click();
    await page.getByRole('button', { name: 'Sign in with Google.com' }).click();
    await page.waitForURL((url) => url.origin === 'http://127.0.0.1:3100' && url.pathname === '/');
    const logout = page.getByRole('button', { name: '登出', exact: true });
    await expect(logout).toBeEnabled({ timeout: 20000 });
    await expect(page.getByRole('button', { name: '建立島嶼', exact: true })).toBeEnabled();
    await page.reload();
    await expect(logout).toBeEnabled();
    await logout.click();
    await expect(page.getByRole('button', { name: '登入', exact: true })).toBeEnabled();
  });
});
