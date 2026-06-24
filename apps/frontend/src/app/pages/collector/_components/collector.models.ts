/** View-model types shared across the collector pages and their presentational components. */

export type CollectorStatItem = {
  label: string;
  value: string;
  icon: string;
};

/** Compact pickup row used inside dashboard panels and list sections. */
export type CollectorPickupCardItem = {
  id: string;
  customer: string;
  /** Address for active assignments, or "category · distance" for nearby requests. */
  subtitle: string;
  weightLabel: string;
  detailRoute: readonly string[];
};

/** Featured "next assignment / recommended request" hero card on the dashboard. */
export type CollectorFeaturedPickup = {
  id: string;
  shortId: string;
  badge: string;
  customer: string;
  address: string;
  statusLabel: string;
  statusClass: string;
  categoryLabel: string;
  weightLabel: string;
  distanceLabel: string;
  detailRoute: readonly string[];
};

export type CollectorLocationCardItem = {
  id: string;
  name: string;
  address: string | null;
  detailRoute: readonly string[];
};

export type CollectorMonthlySummary = {
  key: string;
  label: string;
  pickupCount: number;
  weightKg: number;
  /** 0-100, relative to the heaviest month shown */
  barPercent: number;
};
