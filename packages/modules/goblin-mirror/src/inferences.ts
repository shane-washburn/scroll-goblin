/**
 * Honest local inferences — what a website can reasonably GUESS about you
 * from browser signals alone, each tagged with a confidence level. Nothing
 * here contacts the network; everything is read from the device.
 *
 * The important educational beat: some things (age, gender, income, name)
 * genuinely CANNOT be derived locally. We surface them with confidence
 * "None" and explain that advertisers only "know" them by buying cross-site
 * history from data brokers — which this page never has.
 */

import { isTouchDevice } from "./fingerprint";

export type Confidence = "High" | "Medium" | "Low" | "None";

export interface Inference {
  /** What is being guessed, e.g. "Probable Country". */
  label: string;
  /** The guess shown to the user. */
  value: string;
  /** How much to trust it. */
  confidence: Confidence;
  /** Short caveat explaining the limits of the guess. */
  note?: string;
}

export const INFERENCE_VALUE_LABELS = [
  "Late-night browsing",
  "Morning browsing",
  "Afternoon browsing",
  "Evening browsing",
];

/** Friendly region label from an IANA timezone like "America/Denver". */
function regionFromTimezone(): { value: string; confidence: Confidence } {
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    /* ignore */
  }
  if (!tz) return { value: "Unknown", confidence: "None" };

  const usZones: Record<string, string> = {
    "America/New_York": "Eastern Time · North America",
    "America/Detroit": "Eastern Time · North America",
    "America/Chicago": "Central Time · North America",
    "America/Denver": "Mountain Time · North America",
    "America/Phoenix": "Mountain Time · North America",
    "America/Los_Angeles": "Pacific Time · North America",
    "America/Anchorage": "Alaska Time · North America",
  };
  if (usZones[tz]) return { value: usZones[tz], confidence: "High" };

  const continent = tz.split("/")[0];
  const map: Record<string, string> = {
    America: "The Americas",
    Europe: "Europe",
    Asia: "Asia",
    Africa: "Africa",
    Australia: "Australia",
    Pacific: "Pacific",
    Atlantic: "Atlantic region",
    Indian: "Indian Ocean region",
    Antarctica: "Antarctica (really?)",
  };
  const city = tz.split("/").pop()?.replace(/_/g, " ");
  const region = map[continent] ?? continent;
  return {
    value: city ? `${region} (near ${city})` : region,
    confidence: "High",
  };
}

/** Probable country from the locale's region subtag. */
function countryFromLocale(): { value: string; confidence: Confidence } {
  const lang = navigator.language || "";
  if (!lang) return { value: "Unknown", confidence: "None" };
  try {
    const locale = new Intl.Locale(lang);
    const region =
      locale.region ||
      (typeof locale.maximize === "function"
        ? locale.maximize().region
        : undefined);
    if (!region) return { value: "Unknown", confidence: "Low" };
    const names = new Intl.DisplayNames(undefined, { type: "region" });
    return { value: names.of(region) ?? region, confidence: "Medium" };
  } catch {
    return { value: "Unknown", confidence: "Low" };
  }
}

function deviceType(): { value: string; confidence: Confidence } {
  const ua = navigator.userAgent;
  if (/ipad/i.test(ua) || (isTouchDevice() && Math.min(screen.width, screen.height) >= 768))
    return { value: "Tablet", confidence: "Medium" };
  if (/mobile|iphone|android.*mobile/i.test(ua))
    return { value: "Phone", confidence: "High" };
  if (isTouchDevice()) return { value: "Touch device", confidence: "Medium" };
  return { value: "Desktop / Laptop", confidence: "High" };
}

function deviceTier(): { value: string; confidence: Confidence } {
  const cores = navigator.hardwareConcurrency ?? 0;
  const mem = (navigator as { deviceMemory?: number }).deviceMemory ?? 0;
  if (!cores && !mem) return { value: "Unknown", confidence: "None" };
  if (mem >= 8 && cores >= 8)
    return { value: "High-end", confidence: "Low" };
  if (mem >= 4 || cores >= 4)
    return { value: "Mid-range", confidence: "Low" };
  return { value: "Budget / older", confidence: "Low" };
}

function connectionInfo(): { value: string; confidence: Confidence } {
  const c = (
    navigator as {
      connection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;
  if (!c || !c.effectiveType)
    return { value: "Hidden by browser", confidence: "None" };
  const speed =
    c.effectiveType === "4g"
      ? "Fast (4G/Wi-Fi class)"
      : c.effectiveType === "3g"
        ? "Moderate (3G class)"
        : "Slow (2G class)";
  return {
    value: c.saveData ? `${speed} · Data Saver on` : speed,
    confidence: "Medium",
  };
}

function timeOfDay(): { value: string; confidence: Confidence } {
  const h = new Date().getHours();
  const label =
    h >= 23 || h < 5
      ? "Late-night browsing"
      : h < 12
        ? "Morning browsing"
        : h < 18
          ? "Afternoon browsing"
          : "Evening browsing";
  return { value: label, confidence: "High" };
}

/** Assemble the full inference list, honest items first, the lesson last. */
export function collectInferences(): Inference[] {
  const region = regionFromTimezone();
  const country = countryFromLocale();
  const type = deviceType();
  const tier = deviceTier();
  const conn = connectionInfo();
  const tod = timeOfDay();

  return [
    {
      label: "Rough Location",
      value: region.value,
      confidence: region.confidence,
      note: "From your timezone. A VPN or manual clock can fool this.",
    },
    {
      label: "Probable Country",
      value: country.value,
      confidence: country.confidence,
      note: "From your language setting — many people use English abroad.",
    },
    {
      label: "Device Type",
      value: type.value,
      confidence: type.confidence,
    },
    {
      label: "Device Tier",
      value: tier.value,
      confidence: tier.confidence,
      note: "Inferred from CPU cores and memory the browser reports.",
    },
    {
      label: "Connection",
      value: conn.value,
      confidence: conn.confidence,
    },
    {
      label: "Browsing Time",
      value: tod.value,
      confidence: tod.confidence,
    },
    {
      label: "Age / Gender / Income",
      value: "Cannot be known here",
      confidence: "None",
      note: "No device signal reveals these. Advertisers only 'know' them by buying your cross-site history from data brokers — which this page never has.",
    },
  ];
}
