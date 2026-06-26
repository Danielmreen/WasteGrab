import { expect, test } from '@playwright/test';

import { collectionLocations, completedPickup, mockCollectorApi, pickupA, pickupB, type TestCollectorPickup } from './collector-test-utils';

test('collector my pickups separates completed pickups below active route work', async ({ page }) => {
  await mockCollectorApi(page, {
    pickups: [
      { ...pickupA, status: 'ACCEPTED' },
      pickupB,
      completedPickup,
    ],
  });

  await page.goto('/collector/my-pickups');

  await expect(page.getByRole('heading', { name: 'Assigned Route' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Completed Pickups' })).toBeVisible();
  await expect(page.getByText('1 completed')).toBeVisible();
  await expect(page.getByRole('link', { name: /#AAAAAAAA/ })).toBeVisible();
  await expect(page.getByText('#CCCCCCCC').nth(1)).toBeVisible();
});

test('collector cannot work on a later stop before the route order next stop', async ({ page }) => {
  await mockCollectorApi(page, {
    pickups: [
      { ...pickupA, status: 'ACCEPTED', distanceKm: '1.00' },
      { ...pickupB, status: 'ACCEPTED', distanceKm: '5.00' },
    ],
  });

  await page.goto(`/collector/my-pickups/${pickupB.id}`);

  await expect(page.getByRole('heading', { name: '#BBBBBBBB' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark Arrived' }).click();

  await expect(page.getByText('Follow route order')).toBeVisible();
  await expect(page.getByText(/Next stop is #AAAAAAAA/)).toBeVisible();

  await page.getByRole('button', { name: 'Go to Next Stop' }).click();
  await expect(page).toHaveURL(new RegExp(`/collector/my-pickups/${pickupA.id}$`));
  await expect(page.getByRole('heading', { name: '#AAAAAAAA' })).toBeVisible();
});

test('collector completion dialog navigates to the next active stop and reloads detail', async ({ page }) => {
  let pickups: TestCollectorPickup[] = [
    { ...pickupA, status: 'VERIFIED', distanceKm: '1.00' },
    { ...pickupB, status: 'ACCEPTED', distanceKm: '5.00' },
  ];

  await mockCollectorApi(page, {
    pickups,
    getPickup: (id) => pickups.find((pickup) => pickup.id === id) ?? pickupA,
    onCompletePickup: (id) => {
      pickups = pickups.map((pickup) =>
        pickup.id === id
          ? { ...pickup, status: 'COMPLETED', completedAt: '2026-06-01T11:00:00.000Z' }
          : pickup,
      );
      return pickups.find((pickup) => pickup.id === id) ?? pickupA;
    },
  });

  await page.goto(`/collector/my-pickups/${pickupA.id}`);
  await page.getByRole('button', { name: 'Complete Pickup' }).click();

  await expect(page.getByText('Pickup completed')).toBeVisible();
  await expect(page.getByText(/Next stop is #BBBBBBBB/)).toBeVisible();

  await page.getByRole('button', { name: 'Go to Next Stop' }).click();
  await expect(page).toHaveURL(new RegExp(`/collector/my-pickups/${pickupB.id}$`));
  await expect(page.getByRole('heading', { name: '#BBBBBBBB' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark Arrived' })).toBeVisible();
});

test('collector completing final stop can choose a drop-off location', async ({ page }) => {
  let pickups: TestCollectorPickup[] = [{ ...pickupA, status: 'VERIFIED', distanceKm: '1.00' }];

  await mockCollectorApi(page, {
    pickups,
    onCompletePickup: (id) => {
      pickups = pickups.map((pickup) =>
        pickup.id === id
          ? { ...pickup, status: 'COMPLETED', completedAt: '2026-06-01T11:00:00.000Z' }
          : pickup,
      );
      return pickups[0];
    },
  });

  await page.goto(`/collector/my-pickups/${pickupA.id}`);
  await page.getByRole('button', { name: 'Complete Pickup' }).click();

  await expect(page.getByText('Choose drop-off location')).toBeVisible();
  await expect(page.getByText(collectionLocations[0].name)).toBeVisible();
  await page.getByRole('link', { name: 'Drop-off location' }).click();
  await expect(page).toHaveURL(/\/collector\/locations\/wastegrab-klang-valley-hub--dropoff-klang-valley$/);
});
