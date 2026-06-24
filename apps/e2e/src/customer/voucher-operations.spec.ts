import { expect, test, type Page } from '@playwright/test';

import { customer } from './pickup-test-utils';

const voucher = {
  id: 'voucher-id',
  title: 'Coffee Voucher',
  description: 'Free coffee reward',
  imageUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  pointsCost: 100,
  code: 'COFFEE100',
  stock: 5,
  status: 'ACTIVE',
  startsAt: null,
  expiresAt: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  canRedeem: true,
  unavailableReason: null,
  redemptionCount: 0,
};

test('customer can redeem a reward voucher and view it in My Vouchers', async ({
  page,
}) => {
  await mockCustomerVoucherApi(page);

  await page.goto('/customer/vouchers');

  await expect(page.getByText('Available Points')).toBeVisible();
  await expect(page.getByText('Coffee Voucher')).toBeVisible();
  await expect(
    page
      .locator('article')
      .filter({ hasText: 'Coffee Voucher' })
      .locator('img'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Redeem' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Redeem' }).click();
  await page.getByTestId('z-ok-button').click();

  await expect(
    page.getByRole('heading', { name: 'Voucher Redeemed' }),
  ).toBeVisible();
  await expect(page.getByText('Your code is COFFEE100.')).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByRole('button', { name: 'My Vouchers' })).toHaveClass(
    /bg-card/,
  );
  await expect(page.getByText('COFFEE100', { exact: true })).toBeVisible();
  await expect(page.getByText('100 pts')).toBeVisible();
});

async function mockCustomerVoucherApi(page: Page): Promise<void> {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ json: { user: customer } });
  });

  await page.route('**/api/customer/vouchers', async (route) => {
    await route.fulfill({
      json: {
        pointsBalance: 250,
        vouchers: [voucher],
      },
    });
  });

  await page.route('**/api/customer/vouchers/redemptions', async (route) => {
    await route.fulfill({ json: { redemptions: [] } });
  });

  await page.route('**/api/customer/vouchers/*/redeem', async (route) => {
    await route.fulfill({
      json: {
        pointsBalance: 150,
        redemption: {
          id: 'redemption-id',
          userId: customer.id,
          voucherId: voucher.id,
          pointsSpent: voucher.pointsCost,
          status: 'REDEEMED',
          redeemedCode: voucher.code,
          redeemedAt: '2026-01-02T00:00:00.000Z',
          voucher,
        },
      },
    });
  });
}
