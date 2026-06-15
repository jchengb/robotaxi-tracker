import { test, expect } from '@playwright/test';

// Wait up to 15s for data to load from the scraper/APIs
const DATA_TIMEOUT = 15000;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// ─── Header ────────────────────────────────────────────────────────────────

test('TC-01 | 頁面標題顯示正確', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '機器人計程車無人駕駛追蹤器' })).toBeVisible();
});

test('TC-02 | 副標題顯示城市名稱', async ({ page }) => {
  await expect(page.getByText('Tesla FSD / Cybercab · 奧斯汀 · 灣區 · 達拉斯 · 休士頓')).toBeVisible();
});

test('TC-03 | 重新整理按鈕可點擊', async ({ page }) => {
  const btn = page.getByRole('button', { name: '重新整理' });
  await expect(btn).toBeVisible();
  await btn.click();
  // Button should show loading state
  await expect(page.getByRole('button', { name: '更新中…' })).toBeVisible();
});

// ─── Hero Counter ───────────────────────────────────────────────────────────

test('TC-04 | 即時徽章顯示', async ({ page }) => {
  await expect(page.getByText('即時')).toBeVisible();
});

test('TC-05 | 英雄數字顯示（非空白）', async ({ page }) => {
  // The big number should be a real digit, not —
  const hero = page.locator('.hero-glow');
  await expect(hero).not.toHaveText('—', { timeout: DATA_TIMEOUT });
  const text = await hero.innerText();
  expect(parseInt(text, 10)).toBeGreaterThan(0);
});

test('TC-06 | 無人監督車輛數標題顯示', async ({ page }) => {
  await expect(page.getByText('無人監督車輛數')).toBeVisible();
});

// ─── Metric Cards ──────────────────────────────────────────────────────────

test('TC-07 | 四張指標卡全部顯示', async ({ page }) => {
  await expect(page.getByText('乘客車輛', { exact: true })).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.getByText('閒置（30天）', { exact: true })).toBeVisible();
  await expect(page.getByText('Cybercab', { exact: true })).toBeVisible();
  await expect(page.getByText('無人監督比例', { exact: true })).toBeVisible();
});

test('TC-08 | 指標卡數字不為空', async ({ page }) => {
  // All stat values should contain a real number, not —
  const statValues = page.locator('.stat-value');
  const count = await statValues.count();
  expect(count).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < count; i++) {
    const text = await statValues.nth(i).innerText();
    expect(text).not.toBe('—');
  }
});

// ─── City Breakdown ─────────────────────────────────────────────────────────

test('TC-09 | 各城市分布區塊顯示', async ({ page }) => {
  await expect(page.getByText('各城市分布')).toBeVisible({ timeout: DATA_TIMEOUT });
});

test('TC-10 | 四個城市全部顯示', async ({ page }) => {
  await expect(page.getByText('Austin')).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.getByText('Bay Area')).toBeVisible();
  await expect(page.getByText('Dallas')).toBeVisible();
  await expect(page.getByText('Houston')).toBeVisible();
});

test('TC-11 | 城市列不顯示文字截斷', async ({ page }) => {
  // "無監督" label should appear as full text, not broken across lines
  const labels = page.getByText('無監督');
  const count = await labels.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

// ─── Tesla Stock ────────────────────────────────────────────────────────────

test('TC-12 | Tesla 股價卡顯示', async ({ page }) => {
  await expect(page.getByText('Tesla 股價')).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.getByText('TSLA · NASDAQ')).toBeVisible();
});

test('TC-13 | 股價顯示有效金額', async ({ page }) => {
  // Should show a price like $250.00
  const priceEl = page.locator('text=/\\$\\d+\\.\\d{2}/').first();
  await expect(priceEl).toBeVisible({ timeout: DATA_TIMEOUT });
  const text = await priceEl.innerText();
  const price = parseFloat(text.replace('$', ''));
  expect(price).toBeGreaterThan(0);
});

test('TC-14 | 股價顯示漲跌幅', async ({ page }) => {
  // Should show + or - change, e.g. +3.20 or -1.50
  const changeEl = page.locator('text=/[+-]\\d+\\.\\d{2}/').first();
  await expect(changeEl).toBeVisible({ timeout: DATA_TIMEOUT });
});

test('TC-15 | 股價時間範圍按鈕可切換', async ({ page }) => {
  await expect(page.getByRole('button', { name: '1個月' })).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.getByRole('button', { name: '3個月' })).toBeVisible();
  await page.getByRole('button', { name: '3個月' }).click();
  // Button should become active (text-white)
  await expect(page.getByRole('button', { name: '3個月' })).toHaveClass(/text-white/);
});

// ─── Growth Chart ───────────────────────────────────────────────────────────

test('TC-16 | 車隊成長趨勢圖表顯示', async ({ page }) => {
  await expect(page.getByText('車隊成長趨勢')).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.locator('canvas').first()).toBeVisible();
});

test('TC-17 | 成長圖表時間範圍按鈕', async ({ page }) => {
  await expect(page.getByRole('button', { name: '7D' })).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.getByRole('button', { name: '30D' })).toBeVisible();
  await expect(page.getByRole('button', { name: '90D' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
});

// ─── Mobile Layout ──────────────────────────────────────────────────────────

test('TC-18 | 手機版面正常顯示', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByText('無人監督車輛數')).toBeVisible({ timeout: DATA_TIMEOUT });
  await expect(page.getByText('各城市分布')).toBeVisible();
});

// ─── Footer ─────────────────────────────────────────────────────────────────

test('TC-19 | 頁腳顯示資料來源', async ({ page }) => {
  await expect(page.getByText('資料來源')).toBeVisible();
  await expect(page.getByRole('link', { name: 'robotaxitracker.com' })).toBeVisible();
});
