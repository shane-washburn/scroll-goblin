/**
 * Educational data-broker valuation. Estimates what a visitor's profile might
 * fetch in a real-time-bidding / data-broker sale, scaled by the same kinds of
 * signals the ad-tech industry actually prices on: engagement, device tier,
 * market, location, re-engagement channels, and re-identifiability.
 *
 * These figures are ILLUSTRATIVE. Real per-sale prices for a single person are
 * tiny — fractions of a cent up to roughly $0.50 — but a profile is sold over
 * and over. All amounts are in cents to keep the math clean.
 */

export interface ValueContributor {
  label: string;
  lowCents: number;
  highCents: number;
}

export interface Valuation {
  lowCents: number;
  highCents: number;
  contributors: ValueContributor[];
}

export interface ValuationInput {
  /** Recorded visits (returning visitors are worth more). */
  visits: number;
  /** Active, exploring user vs a passing glance. */
  engaged: boolean;
  /** Device tier reads as a wealth/spend signal. */
  premiumDevice: boolean;
  /** High-CPM advertising market (US/UK/etc.). */
  highCpmCountry: boolean;
  /** Granted precise location. */
  locationGranted: boolean;
  /** Granted notifications (a re-engagement channel). */
  notificationsGranted: boolean;
  /** Granted camera. */
  cameraGranted: boolean;
  /** Granted microphone. */
  micGranted: boolean;
  /** Fingerprint is highly unique → easy to re-identify across sites. */
  highlyUnique: boolean;
  /** Desktop audiences often command slightly higher CPMs than mobile. */
  desktop: boolean;
}

export function estimateDataValue(input: ValuationInput): Valuation {
  const contributors: ValueContributor[] = [
    { label: "Base ad impression", lowCents: 1, highCents: 2 },
  ];

  if (input.visits > 1)
    contributors.push({ label: "Repeat visitor", lowCents: 1, highCents: 3 });
  if (input.engaged)
    contributors.push({ label: "High engagement", lowCents: 2, highCents: 6 });
  if (input.premiumDevice)
    contributors.push({
      label: "Premium device (spend signal)",
      lowCents: 3,
      highCents: 8,
    });
  if (input.highCpmCountry)
    contributors.push({
      label: "High-value ad market",
      lowCents: 2,
      highCents: 6,
    });
  if (input.desktop)
    contributors.push({ label: "Desktop audience", lowCents: 1, highCents: 3 });
  if (input.highlyUnique)
    contributors.push({
      label: "Easily re-identified",
      lowCents: 2,
      highCents: 6,
    });
  if (input.locationGranted)
    contributors.push({
      label: "Precise location shared",
      lowCents: 5,
      highCents: 12,
    });
  if (input.notificationsGranted)
    contributors.push({
      label: "Re-engagement channel",
      lowCents: 2,
      highCents: 5,
    });
  if (input.cameraGranted)
    contributors.push({ label: "Camera access", lowCents: 3, highCents: 8 });
  if (input.micGranted)
    contributors.push({ label: "Microphone access", lowCents: 3, highCents: 8 });

  const lowCents = contributors.reduce((s, c) => s + c.lowCents, 0);
  const highCents = contributors.reduce((s, c) => s + c.highCents, 0);
  return { lowCents, highCents, contributors };
}

/** Format a cent amount as a dollar string, e.g. 42 -> "$0.42". */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Countries whose audiences typically command higher ad CPMs. */
export const HIGH_CPM_COUNTRIES = new Set([
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Germany",
  "Switzerland",
  "Norway",
  "Netherlands",
  "Sweden",
  "Denmark",
  "New Zealand",
  "Ireland",
]);
