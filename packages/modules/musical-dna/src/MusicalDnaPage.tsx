import { useEffect, useMemo, useRef, useState } from "react";
import { Delete, Dna, Play, Shuffle, Sliders, Square, Trash2 } from "lucide-react";
import {
  Card,
  MuteButton,
  ShareButton,
  consumeShareSnapshot,
  trackStat,
  useMobileGameFit,
} from "@scroll-goblin/ui";
import {
  AMINO_ACIDS,
  AMINO_INFO,
  EXTENDED_AMINO_ACIDS,
  GENRE_IDS,
  GENRES,
  MAX_NOTES,
  PROPERTY_COLOR,
  PROPERTY_LABEL,
  type Property,
  generateSong,
  sanitizeSequence,
} from "./music";
import { playSong, type Playback } from "./sounds";

const MODULE_ID = "musical-dna";
const SHARE_VERSION = 1;

interface ShareState {
  seq: string;
  genre: string;
}

const PROPERTIES: Property[] = ["nonpolar", "polar", "positive", "negative"];

function randomGoblinSequence(): string {
  const len = 24 + Math.floor(Math.random() * 24);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += AMINO_ACIDS[Math.floor(Math.random() * AMINO_ACIDS.length)];
  }
  return out;
}

export default function MusicalDnaPage() {
  const [snapshot] = useState(() =>
    consumeShareSnapshot<ShareState>(MODULE_ID, SHARE_VERSION)
  );

  const gameCardRef = useMobileGameFit<HTMLDivElement>({ align: "top" });

  const [sequence, setSequence] = useState(() =>
    snapshot ? sanitizeSequence(snapshot.seq).slice(0, MAX_NOTES) : ""
  );
  const [genreId, setGenreId] = useState(() =>
    snapshot && GENRES[snapshot.genre] ? snapshot.genre : "goblin"
  );
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [plays, setPlays] = useState(0);

  const playbackRef = useRef<Playback | null>(null);
  const rafRef = useRef(0);

  const song = useMemo(
    () => generateSong(sequence, genreId),
    [sequence, genreId]
  );

  const stopPlayback = () => {
    playbackRef.current?.stop();
    playbackRef.current = null;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setProgress(0);
  };

  // Stop any audio when the sequence/genre changes or the page unmounts.
  useEffect(() => stopPlayback, []);
  useEffect(() => {
    stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequence, genreId]);

  const togglePlay = () => {
    if (playing) {
      stopPlayback();
      return;
    }
    if (!song) return;

    const playback = playSong(song, () => stopPlayback());
    playbackRef.current = playback;
    setPlaying(true);
    setPlays((n) => n + 1);
    trackStat(MODULE_ID, "plays");
    trackStat(MODULE_ID, "notes", song.noteCount);

    // Drive the playhead from the audio clock (via playback.progress) so it
    // stays locked to what's actually sounding.
    const tick = () => {
      setProgress(playback.progress());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cycleGenre = () =>
    setGenreId((id) => {
      const i = GENRE_IDS.indexOf(id as (typeof GENRE_IDS)[number]);
      return GENRE_IDS[(i + 1) % GENRE_IDS.length];
    });

  const append = (aa: string) =>
    setSequence((s) => (s.length >= MAX_NOTES ? s : s + aa));
  const backspace = () => setSequence((s) => s.slice(0, -1));
  const clear = () => setSequence("");

  // One palette button. Extended IUPAC codes get a dashed border so they read
  // as "not one of the standard 20" even though they reuse the property colors.
  const residueButton = (aa: string) => {
    const info = AMINO_INFO[aa];
    return (
      <button
        key={aa}
        onClick={() => append(aa)}
        disabled={sequence.length >= MAX_NOTES}
        title={`${aa} — ${info.name} · ${PROPERTY_LABEL[info.property]}${
          info.extended ? " · extended code" : ""
        }`}
        className={`flex flex-col items-center rounded-neobrutal border-thin border-brand-border py-1.5 shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed disabled:cursor-not-allowed disabled:opacity-40 ${
          info.extended ? "border-dashed" : ""
        }`}
        style={{ backgroundColor: info.color }}
      >
        <span className="font-heading text-lg leading-none text-brand-text">
          {aa}
        </span>
        <span className="text-[9px] font-bold leading-tight text-brand-text/70">
          {info.name.slice(0, 3)}
        </span>
      </button>
    );
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    setSequence((s) => (s + sanitizeSequence(text)).slice(0, MAX_NOTES));
  };
  const onType = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSequence(sanitizeSequence(e.target.value).slice(0, MAX_NOTES));

  const canPlay = !!song;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <header className="mb-bento grid gap-bento sm:grid-cols-[1fr_1fr]">
        <div className="rounded-neobrutal border-thick border-brand-border bg-brand-primary p-5 shadow-neo-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-1 text-xs font-bold uppercase shadow-neo-sm">
            🧬 Musical DNA
          </div>
          <h1 className="font-heading text-4xl uppercase leading-none text-brand-text sm:text-5xl">
            Listen to your DNA
          </h1>
        </div>
        <p className="rounded-neobrutal border-thick border-brand-border bg-brand-surface p-5 text-sm font-bold leading-relaxed shadow-neo-lg">
          String together amino acids and hit play. The sequence picks a key,
          scale, tempo, and chord progression — so every protein becomes its own
          little song. Same sequence always sounds the same.
        </p>
      </header>

      <Card ref={gameCardRef} className="overflow-hidden">
        {/* Piano roll / now playing */}
        <div className="bg-brand-background p-4">
          <PianoRoll song={song} progress={playing ? progress : 0} />

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {song ? (
                <>
                  <p className="truncate font-heading text-xl leading-tight">
                    {song.title}
                  </p>
                  <p className="text-xs font-bold text-brand-muted">
                    {song.genreEmoji} {song.genreLabel} · {song.key} ·{" "}
                    {song.mood} · {song.tempo} BPM · {song.noteCount} notes
                  </p>
                </>
              ) : (
                <p className="text-sm font-bold text-brand-muted">
                  Add some amino acids below to compose a song.
                </p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={cycleGenre}
                title="Change musical style — same sequence, different song"
                className="inline-flex items-center gap-1.5 rounded-neobrutal border-thin border-brand-border bg-brand-surface px-3 py-2.5 text-sm font-bold text-brand-text shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
              >
                <Sliders className="h-4 w-4" />
                {GENRES[genreId].emoji} {GENRES[genreId].label}
              </button>
              <button
                onClick={togglePlay}
                disabled={!canPlay}
                className="inline-flex items-center justify-center gap-2 rounded-neobrutal border-thick border-brand-border bg-brand-primary px-5 py-2.5 text-sm font-bold text-brand-text shadow-neo-md transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-neo-pressed disabled:cursor-not-allowed disabled:opacity-50"
              >
                {playing ? (
                  <>
                    <Square className="h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" /> Play
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sequence display */}
        <div className="border-t-thick border-brand-border bg-brand-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase">
              Your sequence ({sequence.length}/{MAX_NOTES})
            </span>
            <div className="flex gap-2">
              <button
                onClick={backspace}
                disabled={sequence.length === 0}
                title="Remove last"
                className="inline-flex items-center gap-1 rounded-neobrutal border-thin border-brand-border bg-brand-background px-2.5 py-1 text-xs font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed disabled:opacity-40"
              >
                <Delete className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={clear}
                disabled={sequence.length === 0}
                title="Clear all"
                className="inline-flex items-center gap-1 rounded-neobrutal border-thin border-brand-border bg-brand-background px-2.5 py-1 text-xs font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          </div>

          <div className="flex min-h-[52px] flex-wrap content-start gap-1 rounded-neobrutal border-thin border-brand-border bg-brand-background p-2">
            {sequence.length === 0 ? (
              <span className="px-1 py-1 text-sm font-bold text-brand-muted">
                Tap residues below, type/paste a sequence, or load a preset.
              </span>
            ) : (
              sequence.split("").map((aa, i) => {
                const info = AMINO_INFO[aa];
                return (
                  <span
                    key={i}
                    title={`${info.name} (${PROPERTY_LABEL[info.property]})`}
                    className="flex h-7 w-7 items-center justify-center rounded border border-brand-border text-sm font-bold text-brand-text"
                    style={{ backgroundColor: info.color }}
                  >
                    {aa}
                  </span>
                );
              })
            )}
          </div>

          {/* Type / paste */}
          <input
            value={sequence}
            onChange={onType}
            onPaste={onPaste}
            spellCheck={false}
            placeholder="…or type / paste here (your name works too — non-amino letters are dropped)"
            className="mt-2 w-full rounded-neobrutal border-thin border-brand-border bg-brand-background px-3 py-2 font-mono text-sm font-bold shadow-neo-sm outline-none focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-neo-pressed"
          />
        </div>

        {/* Amino acid palette */}
        <div className="border-t-thick border-brand-border bg-brand-background p-4">
          {/* Standard 20 — the residues your DNA actually codes for. */}
          <p className="mb-1.5 text-[11px] font-bold uppercase text-brand-muted">
            Standard 20 — the amino acids your DNA codes for
          </p>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
            {AMINO_ACIDS.split("").map(residueButton)}
          </div>

          {/* Extended codes — fill out the rest of the alphabet (A–Z). */}
          <p className="mt-3 text-[11px] font-bold uppercase text-brand-muted">
            Extended codes — rare &amp; ambiguous residues that complete the
            alphabet
          </p>
          <div className="mt-1.5 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {EXTENDED_AMINO_ACIDS.split("").map(residueButton)}
          </div>

          {/* Property legend */}
          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-brand-muted">
            {PROPERTIES.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-3 rounded border border-brand-border"
                  style={{ backgroundColor: PROPERTY_COLOR[p] }}
                />
                {PROPERTY_LABEL[p]}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-dashed border-brand-border" />
              Extended (dashed)
            </span>
          </div>
        </div>

        {/* Generate + share */}
        <div className="flex flex-col gap-3 border-t-thick border-brand-border bg-brand-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSequence(randomGoblinSequence())}
              className="inline-flex items-center gap-1.5 rounded-neobrutal border-thin border-brand-border bg-brand-primary px-3 py-1.5 text-xs font-bold shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
            >
              <Shuffle className="h-3.5 w-3.5" /> Random Goblin DNA
            </button>
            <MuteButton />
            <ShareButton
              moduleId={MODULE_ID}
              version={SHARE_VERSION}
              getState={(): ShareState => ({ seq: sequence, genre: genreId })}
              className="!px-3 !py-1.5 !shadow-neo-sm"
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-muted">
              <Dna className="h-3.5 w-3.5" /> Songs played: {plays}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/** SVG piano-roll of the melody, with bass/chord notes faint behind it. */
function PianoRoll({
  song,
  progress,
}: {
  song: ReturnType<typeof generateSong>;
  progress: number;
}) {
  const W = 1000;
  const H = 220;

  if (!song) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-neobrutal border-thin border-dashed border-brand-border bg-brand-surface text-sm font-bold text-brand-muted">
        🎼 Your song will appear here
      </div>
    );
  }

  // Pitch window spans every track so nothing clips, padded by a couple notes.
  let lo = Infinity;
  let hi = -Infinity;
  for (const ev of song.events) {
    lo = Math.min(lo, ev.midi);
    hi = Math.max(hi, ev.midi);
  }
  lo -= 2;
  hi += 2;
  const range = Math.max(1, hi - lo);
  const totalBeats = Math.max(1, song.totalBeats);

  const x = (beat: number) => (beat / totalBeats) * W;
  const y = (midi: number) => H - ((midi - lo) / range) * H;
  const noteH = Math.max(4, Math.min(14, H / range));

  const trackColor: Record<string, string> = {
    chord: "#a78bfa",
    bass: "#34d399",
    melody: "#f97316",
  };
  const trackOpacity: Record<string, number> = {
    chord: 0.28,
    bass: 0.55,
    melody: 1,
  };

  // Draw chords first (back), then bass, then melody (front).
  const order = ["chord", "bass", "melody"] as const;
  const sorted = order.flatMap((t) => song.events.filter((e) => e.track === t));

  return (
    <div className="overflow-hidden rounded-neobrutal border-thin border-brand-border bg-[#1f2430]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="block h-[220px] w-full"
      >
        {/* Bar lines */}
        {Array.from({ length: song.bars + 1 }, (_, b) => (
          <line
            key={b}
            x1={x(b * song.beatsPerBar)}
            y1={0}
            x2={x(b * song.beatsPerBar)}
            y2={H}
            stroke="#ffffff"
            strokeOpacity={0.08}
            strokeWidth={1}
          />
        ))}

        {sorted.map((ev, i) => (
          <rect
            key={i}
            x={x(ev.time) + 1}
            y={y(ev.midi) - noteH / 2}
            width={Math.max(2, x(ev.time + ev.dur) - x(ev.time) - 2)}
            height={noteH}
            rx={2}
            fill={trackColor[ev.track]}
            opacity={trackOpacity[ev.track]}
          />
        ))}

        {/* Playhead */}
        {progress > 0 && (
          <line
            x1={progress * W}
            y1={0}
            x2={progress * W}
            y2={H}
            stroke="#fde047"
            strokeWidth={2.5}
          />
        )}
      </svg>
    </div>
  );
}
