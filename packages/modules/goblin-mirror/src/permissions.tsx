/**
 * Opt-in "permission dares" — the more you grant, the more the Goblin sees.
 *
 * Hard rules for this file:
 *  - Nothing is ever stored or transmitted. Camera/mic frames are analyzed in
 *    memory and discarded; geolocation coords are shown, never saved.
 *  - Every media stream is torn down on stop AND on unmount (no lingering
 *    camera light). This is the single most important correctness property.
 *  - Saying "no" is a win state, not a dead end — the Goblin congratulates you.
 */

import { useEffect, useRef, useState } from "react";
import { Bell, Camera, Check, Mic, MapPin, ShieldCheck } from "lucide-react";
import { useTranslation } from "@scroll-goblin/ui";

type DareState = "idle" | "requesting" | "granted" | "denied";

interface DareProps {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  buttonLabel: string;
  state: DareState;
  error?: string;
  onRequest: () => void;
  onStop?: () => void;
  /** Permission name shown in the "how to revoke" instructions. */
  revokeLabel?: string;
  /**
   * The "what a site gains from this" explanation. Shown when GRANTED and also
   * when DENIED — cautious users who decline should still learn the stakes.
   */
  lesson?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Instructions for fully revoking a permission. A web page cannot revoke its
 * own permissions via JS — only the browser can — so we explain how.
 */
function RevokeHelp({ label }: { label: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-bold text-brand-text/70 underline"
      >
        {t("How do I take {label} access back?", { label: t(label) })}
      </button>
      {open && (
        <div className="mt-1 rounded-neobrutal border-thin border-brand-border bg-brand-background p-2 text-xs text-brand-text/80">
          <p>
            {t(
              "A web page can't revoke its own permissions — only your browser can. To fully take it back:"
            )}
          </p>
          <ol className="mt-1 list-decimal pl-4">
            <li>
              {t("Click the lock / tune icon at the left of the address bar.")}
            </li>
            <li>
              {t("Find {label} in this site's permissions.", { label: t(label) })}
            </li>
            <li>
              {t("Set it to Block or Ask, then reload the page.")}
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

/** Presentational wrapper shared by every permission dare. */
function Dare({
  icon,
  title,
  blurb,
  buttonLabel,
  state,
  error,
  onRequest,
  onStop,
  revokeLabel,
  lesson,
  children,
}: DareProps) {
  const { t } = useTranslation();
  return (
    <div className="rounded-neobrutal border-thin border-brand-border bg-brand-surface p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-neobrutal border-thin border-brand-border bg-brand-background">
          {icon}
        </span>
        <span className="font-bold text-brand-text">{t(title)}</span>
      </div>

      {state === "idle" && (
        <>
          <p className="mt-2 text-sm text-brand-text/70">{t(blurb)}</p>
          <button
            onClick={onRequest}
            className="mt-2 rounded-neobrutal border-thick border-brand-border bg-brand-secondary px-4 py-2 text-sm font-bold text-brand-text shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
          >
            {t(buttonLabel)}
          </button>
        </>
      )}

      {state === "requesting" && (
        <p className="mt-2 text-sm font-bold text-brand-text">
          {t("Waiting for your answer in the browser prompt...")}
        </p>
      )}

      {state === "granted" && (
        <div className="mt-2">
          {children}
          {lesson}
          {onStop && (
            <button
              onClick={onStop}
              className="mt-2 rounded-neobrutal border-thin border-brand-border bg-brand-alert/20 px-3 py-1.5 text-xs font-bold text-brand-text"
            >
              {t("Stop & release device")}
            </button>
          )}
          {revokeLabel && <RevokeHelp label={revokeLabel} />}
        </div>
      )}

      {state === "denied" && (
        <div className="mt-2">
          <p className="flex items-start gap-1.5 text-sm font-bold text-brand-text">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            {error ??
              t("Smart. You kept that from me — exactly the right instinct.")}
          </p>
          {lesson && (
            <div className="mt-2">
              <p className="text-xs font-bold text-brand-text/70">
                {t("Here's what you just avoided handing over:")}
              </p>
              {lesson}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Small labeled value used inside a granted dare. */
function Readout({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  return (
    <div className="rounded-neobrutal border-thin border-brand-border bg-brand-background px-2 py-1">
      <span className="text-[0.6rem] font-bold uppercase tracking-wide text-brand-text/60">
        {t(label)}
      </span>
      <div className="font-bold text-brand-text">{t(value)}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

export function NotificationDare({ onGrant }: { onGrant?: () => void }) {
  const { t } = useTranslation();
  const supported = typeof Notification !== "undefined";
  const [state, setState] = useState<DareState>(() =>
    supported && Notification.permission === "granted" ? "granted" : "idle"
  );

  // Count a pre-existing grant from a previous visit too.
  useEffect(() => {
    if (state === "granted") onGrant?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!supported) return null;

  const request = () => {
    setState("requesting");
    Notification.requestPermission()
      .then((perm) => {
        if (perm === "granted") {
          onGrant?.();
          setState("granted");
          try {
            new Notification(t("The Goblin can reach you now"), {
              body: t("See? I can tap you on the shoulder whenever I like."),
            });
          } catch {
            /* some browsers require a service worker; ignore */
          }
        } else {
          setState("denied");
        }
      })
      .catch(() => setState("denied"));
  };

  return (
    <Dare
      icon={<Bell className="h-4 w-4" />}
      title="Notifications"
      blurb="Let the Goblin call you back even after you leave."
      buttonLabel="Let Goblin Call You Back"
      state={state}
      onRequest={request}
      revokeLabel="notifications"
      lesson={
        <div className="mt-2 rounded-neobrutal border-thin border-brand-border bg-brand-warning/40 p-2">
          <p className="text-xs font-bold text-brand-text">
            {t(
              "A notification permission is a permanent hook back to you. With it, a site can:"
            )}
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-brand-text/80">
            <li>{t("Ping you any time — even after you close the tab or browser")}</li>
            <li>{t("Learn your timezone and daily rhythm from when you open them")}</li>
            <li>{t("Track which alerts you click to profile what lures you back")}</li>
            <li>{t("Tie a push subscription to your device as a semi-permanent ID")}</li>
            <li>{t("Re-bait you for months to juice engagement numbers")}</li>
          </ul>
          <p className="mt-1 text-xs italic text-brand-text/70">
            {t("The Goblin never actually does this — and nothing leaves your device.")}
          </p>
        </div>
      }
    >
      <Readout label="Re-engagement Channel" value="Enabled" />
    </Dare>
  );
}

/* ------------------------------------------------------------------ */
/* Geolocation                                                         */
/* ------------------------------------------------------------------ */

export function GeolocationDare({ onGrant }: { onGrant?: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<DareState>("idle");
  const [coords, setCoords] = useState<{
    lat: number;
    lon: number;
    acc: number;
  } | null>(null);

  if (!("geolocation" in navigator)) return null;

  const request = () => {
    setState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onGrant?.();
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          acc: pos.coords.accuracy,
        });
        setState("granted");
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? "denied" : "idle");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <Dare
      icon={<MapPin className="h-4 w-4" />}
      title="Location"
      blurb="Let the Goblin pinpoint where you physically are."
      buttonLabel="Let Goblin Find You"
      state={state}
      onRequest={request}
      revokeLabel="location"
      lesson={
        <div className="mt-2 rounded-neobrutal border-thin border-brand-border bg-brand-warning/40 p-2">
          <p className="text-xs font-bold text-brand-text">
            {t(
              "GPS coordinates are far more precise than a city. From them, a website could look up your street address, and from that address typically dig up:"
            )}
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-brand-text/80">
            <li>{t("Your home address and who else lives there")}</li>
            <li>{t("Property records: owner, value, and purchase date")}</li>
            <li>{t("An estimated household income and net-worth bracket")}</li>
            <li>{t("Neighborhood demographics and places you likely visit")}</li>
            <li>{t("Links to public records, voter rolls, and social profiles")}</li>
          </ul>
          <p className="mt-1 text-xs italic text-brand-text/70">
            {t(
              "The Goblin does none of this. Your location never leaves this page — nothing is sent anywhere."
            )}
          </p>
        </div>
      }
    >
      {coords && (
        <div className="grid grid-cols-2 gap-2">
          <Readout
            label="Coordinates"
            value={`${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`}
          />
          <Readout label="Accuracy" value={`±${Math.round(coords.acc)} m`} />
        </div>
      )}
    </Dare>
  );
}

/* ------------------------------------------------------------------ */
/* Camera                                                              */
/* ------------------------------------------------------------------ */

export function CameraDare({ onGrant }: { onGrant?: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<DareState>("idle");
  const [brightness, setBrightness] = useState("—");
  const [movement, setMovement] = useState("—");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const prevLuma = useRef<Float32Array | null>(null);

  const stop = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    prevLuma.current = null;
  };

  // Hard guarantee: tear the camera down when the component unmounts.
  useEffect(() => stop, []);

  // Attach the stream + start sampling once we're in the granted state.
  useEffect(() => {
    if (state !== "granted") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(() => {});

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 48;
    const ctx = canvas.getContext("2d");

    timerRef.current = window.setInterval(() => {
      if (!ctx || !video.videoWidth) return;
      ctx.drawImage(video, 0, 0, 64, 48);
      const { data } = ctx.getImageData(0, 0, 64, 48);
      const luma = new Float32Array(64 * 48);
      let sum = 0;
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        luma[p] = l;
        sum += l;
      }
      const avg = sum / luma.length;
      setBrightness(avg < 60 ? "Dark" : avg < 140 ? "Dim" : "Bright");

      if (prevLuma.current) {
        let diff = 0;
        for (let i = 0; i < luma.length; i++) {
          diff += Math.abs(luma[i] - prevLuma.current[i]);
        }
        const motion = diff / luma.length;
        setMovement(
          motion < 2 ? "Minimal" : motion < 8 ? "Some movement" : "Lots of movement"
        );
      }
      prevLuma.current = luma;
    }, 500);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  const request = async () => {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      onGrant?.();
      setState("granted");
    } catch {
      setState("denied");
    }
  };

  const onStop = () => {
    stop();
    setBrightness("—");
    setMovement("—");
    setState("idle");
  };

  return (
    <Dare
      icon={<Camera className="h-4 w-4" />}
      title="Camera"
      blurb="Let the Goblin look through your camera (stays on your device)."
      buttonLabel="Let Goblin See You"
      state={state}
      onRequest={request}
      onStop={onStop}
      revokeLabel="camera"
      lesson={
        <div className="mt-2 rounded-neobrutal border-thin border-brand-border bg-brand-warning/40 p-2">
          <p className="text-xs font-bold text-brand-text">
            {t("A brightness reading is the least of it. With real camera access, a site could:")}
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-brand-text/80">
            <li>{t("Capture your face and match it to photos of you elsewhere")}</li>
            <li>{t("Read your expression to infer mood or attention")}</li>
            <li>{t("See who else is in the room with you")}</li>
            <li>{t("Identify your surroundings — home, office, car, in bed")}</li>
            <li>{t("Catch documents, screens, or reflections in view")}</li>
            <li>{t("Even estimate your heart rate from skin-color changes")}</li>
          </ul>
          <p className="mt-1 flex items-center gap-1 text-xs italic text-brand-text/70">
            <Check className="h-3 w-3 shrink-0" />{" "}
            {t(
              "The Goblin only measures brightness and motion, live. Nothing is captured or sent."
            )}
          </p>
        </div>
      }
    >
      <video
        ref={videoRef}
        muted
        playsInline
        className="mb-2 h-28 w-full rounded-neobrutal border-thin border-brand-border object-cover"
      />
      <div className="grid grid-cols-2 gap-2">
        <Readout label="Lighting" value={brightness} />
        <Readout label="Movement" value={movement} />
      </div>
    </Dare>
  );
}

/* ------------------------------------------------------------------ */
/* Microphone                                                          */
/* ------------------------------------------------------------------ */

export function MicrophoneDare({ onGrant }: { onGrant?: () => void }) {
  const { t } = useTranslation();
  const [state, setState] = useState<DareState>("idle");
  const [level, setLevel] = useState(0);
  const [noise, setNoise] = useState("—");
  const [speech, setSpeech] = useState("—");

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  const stop = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  };

  useEffect(() => stop, []);

  useEffect(() => {
    if (state !== "granted") return;
    const stream = streamRef.current;
    if (!stream) return;

    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audioCtx = new Ctx();
    audioCtxRef.current = audioCtx;
    audioCtx.resume().catch(() => {});

    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    timerRef.current = window.setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      let sumSq = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sumSq += v * v;
      }
      const rms = Math.sqrt(sumSq / buf.length);
      setLevel(Math.min(100, Math.round(rms * 300)));
      setNoise(rms < 0.04 ? "Quiet" : rms < 0.12 ? "Moderate" : "Loud");
      setSpeech(rms > 0.06 ? "Detected" : "None");
    }, 200);

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state]);

  const request = async () => {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      onGrant?.();
      setState("granted");
    } catch {
      setState("denied");
    }
  };

  const onStop = () => {
    stop();
    setLevel(0);
    setNoise("—");
    setSpeech("—");
    setState("idle");
  };

  return (
    <Dare
      icon={<Mic className="h-4 w-4" />}
      title="Microphone"
      blurb="Let the Goblin listen to your surroundings (stays on your device)."
      buttonLabel="Let Goblin Hear You"
      state={state}
      onRequest={request}
      onStop={onStop}
      revokeLabel="microphone"
      lesson={
        <div className="mt-2 rounded-neobrutal border-thin border-brand-border bg-brand-warning/40 p-2">
          <p className="text-xs font-bold text-brand-text">
            {t("A loudness meter is the least of it. With raw microphone access, a site could work out:")}
          </p>
          <ul className="mt-1 list-disc pl-4 text-xs text-brand-text/80">
            <li>{t("Whether you're alone or others are nearby (multiple voices)")}</li>
            <li>{t("Your setting — quiet home, busy office, car, or street")}</li>
            <li>{t("Speech turned to text: topics, names, even your mood")}</li>
            <li>{t("TV or music in the background — the media you consume")}</li>
            <li>{t("Inaudible ultrasonic beacons in ads that link your phone to your TV")}</li>
            <li>{t("Even what you type, from the sound of your keystrokes")}</li>
          </ul>
          <p className="mt-1 flex items-center gap-1 text-xs italic text-brand-text/70">
            <Check className="h-3 w-3 shrink-0" />{" "}
            {t(
              "The Goblin only measures loudness, live. Nothing is recorded, transcribed, or sent."
            )}
          </p>
        </div>
      }
    >
      <div className="mb-2 h-3 w-full overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-background">
        <div
          className="h-full bg-brand-primary transition-[width] duration-150"
          style={{ width: `${level}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Readout label="Environment" value={noise} />
        <Readout label="Speech Activity" value={speech} />
      </div>
    </Dare>
  );
}
