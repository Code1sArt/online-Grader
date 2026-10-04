// Optional read-only smoke check. Start `npm run dev` first.
// Does not click Google Login, use an account, or write to the backend.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge',
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('console', (entry) => {
    if (entry.type() === 'error')
      errors.push(entry.text().replace(/client_id=[^&\s]+/g, 'client_id=[public-id]'));
  });
  await page.goto('http://localhost:5173/login');
  const button = page.locator('.google-signin [role="button"]');
  await button.waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.screenshot({ path: 'test-results/login-configured.png', fullPage: true });
  console.log(
    JSON.stringify({
      title: await page.title(),
      googleButtons: await button.count(),
      buttonVisible: await button.isVisible(),
      text: await page.locator('.google-signin').innerText(),
      alerts: await page.getByRole('alert').allTextContents(),
      errors,
    }),
  );
  if (!(await button.isVisible()) || errors.some((error) => error.includes('GSI_LOGGER')))
    process.exitCode = 1;
} finally {
  await browser.close();
}
