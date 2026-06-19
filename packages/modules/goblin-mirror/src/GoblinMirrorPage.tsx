import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  ChevronDown,
  Coins,
  Cookie,
  Database,
  Eye,
  Fingerprint as FingerprintIcon,
  Footprints,
  Ghost,
  KeyRound,
  Lock,
  ScanLine,
  Trash2,
} from "lucide-react";
import { Card, ShareButton, trackStat, useTranslation } from "@scroll-goblin/ui";
import {
  collectFingerprint,
  formatOneInN,
  formatShare,
  type Fingerprint,
  type FingerprintSignal,
} from "./fingerprint";
import {
  addTimeSpent,
  clearCookies,
  clearLocalStorage,
  exactFirstSeen,
  readMemory,
  recordVisit,
  type MemoryState,
} from "./memory";
import {
  formatSessionClock,
  useBehaviorMetrics,
  type BehaviorMetrics,
} from "./behavior";
import { collectInferences, type Confidence } from "./inferences";
import {
  estimateDataValue,
  formatCents,
  HIGH_CPM_COUNTRIES,
} from "./valuation";
import {
  CameraDare,
  GeolocationDare,
  MicrophoneDare,
  NotificationDare,
} from "./permissions";

const MODULE_ID = "goblin-mirror";
const SHARE_VERSION = 1;
export const GOBLIN_MIRROR_SOURCE_LABELS = [
  "The Goblin's Eyes",
  "Goblin Memory #1",
  "Goblin Memory #2",
  "The Experiment",
  "Behavioral Tracking",
  "Permission Unlocks",
  "The Goblin's Guesses",
  "Data Broker Auction",
  "Goblin Surveillance Report",
  "Loyal Returning Specimen",
  "Caffeinated Doomscroller",
  "Careful Reader",
  "Silent Lurker",
  "Late-Night Browser",
  "Curious Wanderer",
  "Fast Scroller",
  "Still as Stone",
  "Explorer",
  "Skimmer",
  "Lurker",
  "Highly Unique",
  "Moderately Unique",
  "Common",
  "Interesting Specimen",
  "Mildly Trackable Creature",
  "Refreshingly Forgettable",
  "Active",
  "active",
  "Empty",
  "erased",
  "Just now",
  "Earlier today",
  "{count} hours ago",
  "1 day ago",
  "{count} days ago",
  "{hours}h {minutes}m",
  "{minutes}m {seconds}s",
  "{seconds}s",
];

interface ShareState {
  hash: string;
  rarity: string;
  oneInN: number;
  archetype: string;
  rating: string;
  value: string;
}

/** Derive a playful "user archetype" from real behavior + memory signals. */
function deriveArchetype(b: BehaviorMetrics, m: MemoryState): string {
  if (m.visits >= 5) return "Loyal Returning Specimen";
  if (b.interactionStyle === "Explorer" && b.scrollStyle === "Fast Scroller")
    return "Caffeinated Doomscroller";
  if (b.scrollStyle === "Careful Reader") return "Careful Reader";
  if (b.interactionStyle === "Lurker") return "Silent Lurker";
  const hour = new Date().getHours();
  if (hour >= 23 || hour < 5) return "Late-Night Browser";
  return "Curious Wanderer";
}

function ratingFor(fp: Fingerprint): string {
  if (fp.rarity === "Highly Unique") return "Interesting Specimen";
  if (fp.rarity === "Moderately Unique") return "Mildly Trackable Creature";
  return "Refreshingly Forgettable";
}

/** A labeled stat tile used throughout the report. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-neobrutal border-thin border-brand-border bg-brand-surface px-3 py-2">
      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-brand-text/60">
        {t(label)}
      </div>
      <div className="break-words font-bold text-brand-text">{value}</div>
    </div>
  );
}

/** Translate a signal's population share into a friendly rarity badge. */
function signalRarity(share: number): { label: string; className: string } {
  if (share < 0.01) return { label: "Very rare", className: "bg-brand-pink" };
  if (share < 0.05) return { label: "Rare", className: "bg-brand-orange" };
  if (share < 0.2) return { label: "Uncommon", className: "bg-brand-warning" };
  return { label: "Common", className: "bg-brand-background" };
}

/** A fingerprint signal tile that also shows how identifying the value is. */
function SignalStat({ signal }: { signal: FingerprintSignal }) {
  const { t } = useTranslation();
  const r = signalRarity(signal.share);
  return (
    <div
      title={`Adds ~${signal.bits.toFixed(1)} bits of uniqueness`}
      className="rounded-neobrutal border-thin border-brand-border bg-brand-surface px-3 py-2"
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[0.65rem] font-bold uppercase tracking-wide text-brand-text/60">
          {t(signal.label)}
        </span>
        <span
          className={`shrink-0 rounded-neobrutal border-thin border-brand-border px-1 py-0.5 text-[0.5rem] font-bold uppercase tracking-wide ${r.className}`}
        >
          {t(r.label)}
        </span>
      </div>
      <div className="break-words font-bold text-brand-text">{t(signal.value)}</div>
      <div className="mt-0.5 text-[0.6rem] font-bold text-brand-text/50">
        {t("Matches ~{share} of people", {
          share: formatShare(signal.share),
        })}
      </div>
    </div>
  );
}

const CONFIDENCE_STYLE: Record<Confidence, string> = {
  High: "bg-brand-primary",
  Medium: "bg-brand-warning",
  Low: "bg-brand-orange",
  None: "bg-brand-surface",
};

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-block rounded-neobrutal border-thin border-brand-border px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide ${CONFIDENCE_STYLE[confidence]}`}
    >
      {confidence === "None"
        ? t("Can't tell")
        : t("{confidence} confidence", { confidence: t(confidence) })}
    </span>
  );
}

function SectionHeading({
  icon,
  kicker,
  title,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-neobrutal border-thick border-brand-border bg-brand-warning shadow-neo-sm">
        {icon}
      </div>
      <div>
        <div className="text-[0.7rem] font-bold uppercase tracking-widest text-brand-text/60">
          {t(kicker)}
        </div>
        <h2 className="font-heading text-xl leading-none text-brand-text">
          {t(title)}
        </h2>
      </div>
    </div>
  );
}

export default function GoblinMirrorPage() {
  const { t } = useTranslation();
  // Fingerprint is computed once and never changes within a session — this is
  // exactly what lets the Phase 6 "twist" work.
  const [fp] = useState<Fingerprint>(() => collectFingerprint());
  const [memory, setMemory] = useState<MemoryState>(() => readMemory());
  const behavior = useBehaviorMetrics(1000);

  const [scanning, setScanning] = useState(true);
  const [cookiesWiped, setCookiesWiped] = useState(false);
  const [lsWiped, setLsWiped] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [grantedPerms, setGrantedPerms] = useState<Set<string>>(
    () => new Set()
  );
  const markGranted = useCallback((id: string) => {
    setGrantedPerms((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  // Record the visit exactly once. React 18 StrictMode double-invokes mount
  // effects in dev, which would otherwise increment the cookie counter (and
  // the "scans" stat) twice — so we guard with a ref.
  const didRecord = useRef(false);
  useEffect(() => {
    if (didRecord.current) return;
    didRecord.current = true;
    setMemory(recordVisit());
    trackStat(MODULE_ID, "scans");
  }, []);

  // Reveal the report after a short scan animation. Kept separate from the
  // record-once effect so StrictMode's cleanup/re-run can't leave it stuck.
  useEffect(() => {
    const t = setTimeout(() => setScanning(false), 2200);
    return () => clearTimeout(t);
  }, []);

  // Persist elapsed session time when the user leaves, feeding the running
  // "time wasted" total that returning visitors will see.
  const mountedAt = useRef(Date.now());
  useEffect(() => {
    const flush = () => addTimeSpent(Date.now() - mountedAt.current);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  const archetype = useMemo(
    () => deriveArchetype(behavior, memory),
    [behavior, memory]
  );
  const rating = useMemo(() => ratingFor(fp), [fp]);
  const inferences = useMemo(() => collectInferences(), []);

  // Split fingerprint signals for display: meaningful ones up front, the rest
  // behind a toggle. Both groups still counted toward the uniqueness score.
  const primarySignals = fp.signals.filter((s) => s.tier === "primary");
  const technicalSignals = fp.signals.filter((s) => s.tier === "technical");

  // Plain-language one-liner built from the friendliest signals.
  const sigValue = (label: string) =>
    fp.signals.find((s) => s.label === label)?.value ?? "Unknown";
  const summaryDevice =
    inferences.find((i) => i.label === "Device Type")?.value ?? "device";
  const summaryLocation =
    inferences.find((i) => i.label === "Rough Location")?.value ??
    sigValue("Timezone");

  // Reactive data-broker valuation: grows as more is exposed/granted.
  const valuation = useMemo(() => {
    const country =
      inferences.find((i) => i.label === "Probable Country")?.value ?? "";
    const deviceTier =
      inferences.find((i) => i.label === "Device Tier")?.value ?? "";
    return estimateDataValue({
      visits: memory.visits,
      engaged:
        behavior.interactionStyle === "Explorer" ||
        behavior.sessionSeconds > 120,
      premiumDevice: deviceTier === "High-end",
      highCpmCountry: HIGH_CPM_COUNTRIES.has(country),
      locationGranted: grantedPerms.has("location"),
      notificationsGranted: grantedPerms.has("notifications"),
      cameraGranted: grantedPerms.has("camera"),
      micGranted: grantedPerms.has("mic"),
      highlyUnique: fp.rarity === "Highly Unique",
      desktop: !behavior.touch,
    });
  }, [inferences, memory.visits, behavior, grantedPerms, fp.rarity]);

  const onDeleteCookies = () => {
    setMemory(clearCookies());
    setCookiesWiped(true);
  };

  const onDeleteLocalStorage = () => {
    setMemory(clearLocalStorage());
    setLsWiped(true);
  };

  const bothWiped = cookiesWiped && lsWiped;

  const valueRange = `${formatCents(valuation.lowCents)}–${formatCents(
    valuation.highCents
  )}`;

  const shareState: ShareState = {
    hash: fp.hash,
    rarity: fp.rarity,
    oneInN: fp.oneInN,
    archetype,
    rating,
    value: valueRange,
  };

  const firstSeenRelative = (firstSeen: number | null) => {
    if (!firstSeen) return t("Just now");
    const diff = Date.now() - firstSeen;
    if (diff < 60_000) return t("Just now");
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return hours <= 1
        ? t("Earlier today")
        : t("{count} hours ago", { count: hours });
    }
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return days === 1 ? t("1 day ago") : t("{count} days ago", { count: days });
  };

  const durationLabel = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return t("{hours}h {minutes}m", { hours: h, minutes: m });
    if (m > 0) return t("{minutes}m {seconds}s", { minutes: m, seconds: s });
    return t("{seconds}s", { seconds: s });
  };

  return (
    <div className="min-h-screen bg-brand-surface px-4 py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        {/* Header */}
        <header className="text-center">
          <div className="text-5xl">🪞🧌</div>
          <h1 className="mt-2 font-heading text-3xl leading-tight text-brand-text">
            {t("Goblin Surveillance Mirror")}
          </h1>
          <p className="mt-2 text-sm text-brand-text/70">
            {t(
              "What does the internet know about you? Everything below runs on your device only — the Goblin sends nothing to any server."
            )}
          </p>
        </header>

        {/* Phase 1: Arrival scan */}
        {scanning ? (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <ScanLine className="h-10 w-10 animate-pulse text-brand-text" />
            <div className="font-heading text-xl">
              {t("The Goblin sees a visitor...")}
            </div>
            <div className="text-sm text-brand-text/60">{t("Scanning device.")}</div>
          </Card>
        ) : (
          <>
            {/* Phase 2: Fingerprinting */}
            <Card className="p-5">
              <SectionHeading
                icon={<FingerprintIcon className="h-5 w-5" />}
                kicker="The Goblin's Eyes"
                title="I can recognize your device"
              />
              <p className="mb-4 text-brand-text">
                {t(
                  "You're on {browser} / {operatingSystem} — a {device} in {location}, reading in {language}.",
                  {
                    browser: sigValue("Browser"),
                    operatingSystem: sigValue("Operating System"),
                    device: t(summaryDevice).toLowerCase(),
                    location: t(summaryLocation),
                    language: sigValue("Language"),
                  }
                )}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {primarySignals.map((s) => (
                  <SignalStat key={s.label} signal={s} />
                ))}
              </div>
              <p className="mt-2 text-xs text-brand-text/60">
                {t(
                  "Each tile shows roughly how many people share your value — the rarer it is, the more it singles you out. Combine a few rare ones and you're trivial to pick out of a crowd."
                )}
              </p>

              {/* The technical signals: hidden by default, but always counted. */}
              <button
                onClick={() => setShowTechnical((v) => !v)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-neobrutal border-thin border-brand-border bg-brand-surface px-3 py-1.5 text-xs font-bold text-brand-text"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showTechnical ? "rotate-180" : ""
                  }`}
                />
                {showTechnical
                  ? t("Hide technical signals")
                  : t(
                      "Show the {count} technical signals the Goblin also used",
                      { count: technicalSignals.length }
                    )}
              </button>
              {showTechnical && (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {technicalSignals.map((s) => (
                      <SignalStat key={s.label} signal={s} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs italic text-brand-text/50">
                    {t(
                      "These look like gibberish to you — and that's the point. Your GPU, canvas drawing, and installed fonts are exactly what make your device stand out from the crowd."
                    )}
                  </p>
                </>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-neobrutal border-thick border-brand-border bg-brand-primary p-4">
                <div className="flex-1">
                  <div className="text-[0.7rem] font-bold uppercase tracking-widest text-brand-text/70">
                    {t("Fingerprint")}
                  </div>
                  <div className="font-heading text-2xl">{t(fp.rarity)}</div>
                  <div className="text-sm text-brand-text/80">
                    {t(
                      "Roughly 1 in {count} people share a device profile like yours ({bits} bits of entropy).",
                      {
                        count: formatOneInN(fp.oneInN),
                        bits: fp.totalBits.toFixed(1),
                      }
                    )}
                  </div>
                </div>
                <code className="rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-2 font-bold">
                  #{fp.hash}
                </code>
              </div>
              <p className="mt-2 text-xs italic text-brand-text/50">
                {t(
                  "This describes a type of device, not a proven one-of-a-kind machine. Many signals overlap (a phone model locks its screen, GPU and fonts together), so we discount for that — desktops vary a lot and trend unique, while phones cluster and are far less identifying. It's an estimate from all {count} signals above, calibrated against public research (EFF Panopticlick, AmIUnique). A precise figure would need a live database of real visitors — which would mean sending your data off-device, so the Goblin won't.",
                  { count: fp.signals.length }
                )}
              </p>
            </Card>

            {/* Phase 3: Memory */}
            <Card className="p-5">
              <SectionHeading
                icon={<Cookie className="h-5 w-5" />}
                kicker="Goblin Memory #1"
                title="Cookies"
              />
              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label="Visits"
                  value={cookiesWiped ? "0" : String(memory.visits)}
                />
                <Stat
                  label="First Seen"
                  value={
                    cookiesWiped
                      ? t("Forgotten")
                      : `${firstSeenRelative(memory.firstSeen)} · ${exactFirstSeen(
                          memory.firstSeen
                        )}`
                  }
                />
              </div>
              <p className="mt-3 text-sm text-brand-text/70">
                {t(
                  "Cookies help websites remember you between visits. Come back later and watch this count climb."
                )}
              </p>

              <div className="mt-5">
                <SectionHeading
                  icon={<Database className="h-5 w-5" />}
                  kicker="Goblin Memory #2"
                  title="Local Storage"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    label="Time Wasted Here"
                    value={
                      lsWiped ? t("Forgotten") : durationLabel(memory.totalTimeMs)
                    }
                  />
                  <Stat
                    label="Storage Status"
                    value={memory.hasLocalStorage ? t("Active") : t("Empty")}
                  />
                </div>
                <p className="mt-3 text-sm text-brand-text/70">
                  {t(
                    "Local Storage can remember far more than cookies, and websites reach for it constantly."
                  )}
                </p>
              </div>
            </Card>

            {/* Phase 4 + 5: Deletion demos */}
            <Card className="p-5">
              <SectionHeading
                icon={<Trash2 className="h-5 w-5" />}
                kicker="The Experiment"
                title="Can you escape Goblin Memory?"
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={onDeleteCookies}
                  disabled={cookiesWiped}
                  className="flex-1 rounded-neobrutal border-thick border-brand-border bg-brand-pink px-4 py-3 font-bold text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed disabled:opacity-50"
                >
                  {cookiesWiped ? t("Cookies erased ✓") : t("Delete Cookies")}
                </button>
                <button
                  onClick={onDeleteLocalStorage}
                  disabled={lsWiped}
                  className="flex-1 rounded-neobrutal border-thick border-brand-border bg-brand-orange px-4 py-3 font-bold text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed disabled:opacity-50"
                >
                  {lsWiped ? t("Browser storage erased ✓") : t("Delete browser storage")}
                </button>
              </div>
              {(cookiesWiped || lsWiped) && (
                <p className="mt-3 text-sm font-bold text-brand-text">
                  {cookiesWiped && `${t("Cookie memory erased.")} `}
                  {lsWiped && `${t("Local memory erased.")} `}
                  {t("Feeling safe yet?")}
                </p>
              )}
            </Card>

            {/* Phase 6: The Twist */}
            {bothWiped && (
              <Card className="border-brand-alert bg-brand-alert/10 p-5">
                <SectionHeading
                  icon={<Ghost className="h-5 w-5" />}
                  kicker="The Twist"
                  title="The Goblin still recognizes you"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <code className="rounded-neobrutal border-thick border-brand-border bg-brand-background px-3 py-2 font-bold">
                    #{fp.hash}
                  </code>
                  <span className="text-sm font-bold text-brand-text">
                    {t("Same fingerprint as before. ↑")}
                  </span>
                </div>
                <p className="mt-3 text-sm text-brand-text/80">
                  {t(
                    "Your cookies are gone. Your Local Storage is gone. But your device fingerprint remains. Clearing storage doesn't make you anonymous — your device itself is identifying."
                  )}
                </p>
              </Card>
            )}

            {/* Phase 7: Behavioral tracking */}
            <Card className="p-5">
              <SectionHeading
                icon={<Footprints className="h-5 w-5" />}
                kicker="Behavioral Tracking"
                title="I'm watching how you move"
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Stat label="Session" value={formatSessionClock(behavior.sessionSeconds)} />
                <Stat label="Scroll Style" value={t(behavior.scrollStyle)} />
                <Stat
                  label={behavior.touch ? "Touch Style" : "Mouse Style"}
                  value={t(behavior.interactionStyle)}
                />
                <Stat label="Clicks / Taps" value={String(behavior.clicks)} />
                <Stat label="Idle Periods" value={String(behavior.idlePeriods)} />
                <Stat label="Archetype" value={t(archetype)} />
              </div>
              <p className="mt-3 text-sm text-brand-text/70">
                {t(
                  "Websites infer who you are from behavior alone — no name required. These metrics update live."
                )}
              </p>
            </Card>

            {/* Phase 8: Permission dares — every yes reveals more */}
            <Card className="p-5">
              <SectionHeading
                icon={<KeyRound className="h-5 w-5" />}
                kicker="Permission Unlocks"
                title="Every 'yes' tells me more"
              />
              <div className="flex flex-col gap-3">
                <NotificationDare onGrant={() => markGranted("notifications")} />
                <GeolocationDare onGrant={() => markGranted("location")} />
                <CameraDare onGrant={() => markGranted("camera")} />
                <MicrophoneDare onGrant={() => markGranted("mic")} />
              </div>
              <p className="mt-3 text-sm text-brand-text/70">
                {t(
                  "Notice how each permission hands me a brand-new sense. Saying no is always a valid move — that's the whole point."
                )}
              </p>
            </Card>

            {/* Phase 9: Honest inferences with confidence */}
            <Card className="p-5">
              <SectionHeading
                icon={<Brain className="h-5 w-5" />}
                kicker="The Goblin's Guesses"
                title="What I can guess about you"
              />
              <div className="flex flex-col gap-2">
                {inferences.map((inf) => (
                  <div
                    key={inf.label}
                    className="rounded-neobrutal border-thin border-brand-border bg-brand-surface p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[0.65rem] font-bold uppercase tracking-wide text-brand-text/60">
                        {t(inf.label)}
                      </span>
                      <ConfidenceBadge confidence={inf.confidence} />
                    </div>
                    <div className="font-bold text-brand-text">{t(inf.value)}</div>
                    {inf.note && (
                      <div className="mt-1 text-xs italic text-brand-text/60">
                        {t(inf.note)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-brand-text/70">
                {t(
                  "Guesses, not facts. Notice the bottom one: your age, gender, and income can't be read from your device at all — those come from data brokers, not your browser."
                )}
              </p>
            </Card>

            {/* Phase 10: Data broker auction */}
            <Card className="p-5">
              <SectionHeading
                icon={<Coins className="h-5 w-5" />}
                kicker="Data Broker Auction"
                title="If your data were sold..."
              />
              <p className="mb-3 text-sm text-brand-text/70">
                {t(
                  "Advertisers rarely know who you are — they bid on profiles. Here's a mock auction for yours, scaled by the signals brokers actually price on. Grant more above and watch it climb."
                )}
              </p>
              <div className="flex flex-col gap-1">
                {valuation.contributors.map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center justify-between rounded-neobrutal border-thin border-brand-border bg-brand-surface px-3 py-1.5 text-sm"
                  >
                    <span className="text-brand-text/80">{t(c.label)}</span>
                    <span className="font-bold text-brand-text">
                      +{formatCents(c.lowCents)}–{formatCents(c.highCents)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-neobrutal border-thick border-brand-border bg-brand-primary p-4">
                <div className="text-[0.7rem] font-bold uppercase tracking-widest text-brand-text/70">
                  {t("Estimated Profile Value")}
                </div>
                <div className="font-heading text-3xl">
                  {formatCents(valuation.lowCents)} –{" "}
                  {formatCents(valuation.highCents)}
                </div>
                <div className="text-sm text-brand-text/80">
                  {t("per sale — and a profile is sold over and over.")}
                </div>
              </div>
              <p className="mt-2 text-xs italic text-brand-text/50">
                {t(
                  "Educational simulation. Real per-sale prices for one person run from fractions of a cent up to roughly $0.50; these figures are illustrative, scaled by the same criteria (engagement, device, market, location, re-identifiability) that data brokers use."
                )}
              </p>
            </Card>

            {/* Phase 11: Final Report */}
            <Card className="p-5">
              <SectionHeading
                icon={<Eye className="h-5 w-5" />}
                kicker="Goblin Surveillance Report"
                title="What I know, remember, and guessed"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-sm font-bold text-brand-text">
                    {t("What I Know")}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-brand-text/80">
                    <li>{t("Browser, OS, screen & GPU")}</li>
                    <li>{t("Timezone & language")}</li>
                    <li>
                      {t("Session length")}:{" "}
                      {formatSessionClock(behavior.sessionSeconds)}
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-sm font-bold text-brand-text">
                    {t("What I Remember")}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-brand-text/80">
                    <li>
                      {t("Cookies")}:{" "}
                      {cookiesWiped
                        ? t("erased")
                        : t("{count} visits", { count: memory.visits })}
                    </li>
                    <li>
                      {t("Local Storage")}: {lsWiped ? t("erased") : t("active")}
                    </li>
                    <li>
                      {t("Fingerprint")}: #{fp.hash} {t("(survives wipes)")}
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-sm font-bold text-brand-text">
                    {t("What I Inferred")}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-brand-text/80">
                    <li>
                      {t("Engagement")}: {t(behavior.interactionStyle)}
                    </li>
                    <li>
                      {t("Reading style")}: {t(behavior.scrollStyle)}
                    </li>
                    <li>
                      {t("Archetype")}: {t(archetype)}
                    </li>
                  </ul>
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-1 text-sm font-bold text-brand-text">
                    <Lock className="h-4 w-4" /> {t("What I Don't Know")}
                  </div>
                  <ul className="list-disc pl-5 text-sm text-brand-text/80">
                    <li>{t("Your name")}</li>
                    <li>{t("Your income")}</li>
                    <li>{t("Your passwords or messages")}</li>
                  </ul>
                </div>
              </div>

              {/* Shareable score card */}
              <div className="mt-5 rounded-neobrutal border-thick border-brand-border bg-brand-secondary p-4">
                <div className="font-heading text-lg">
                  {t("Goblin Surveillance Score")}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Stat label="Fingerprint Uniqueness" value={t(fp.rarity)} />
                  <Stat
                    label="Tracking Resistance"
                    value={bothWiped ? t("Tried & Failed") : t("Untested")}
                  />
                  <Stat label="Goblin Rating" value={t(rating)} />
                  <Stat label="Est. Data Value" value={valueRange} />
                  <Stat label="Specimen ID" value={`#${fp.hash}`} />
                </div>
                <div className="mt-3">
                  <ShareButton
                    moduleId={MODULE_ID}
                    version={SHARE_VERSION}
                    getState={() => shareState}
                  />
                </div>
              </div>

              <p className="mt-4 text-center text-xs italic text-brand-text/50">
                {t(
                  "Educational simulation. The Goblin kept all of this on your device and sent none of it anywhere."
                )}
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
