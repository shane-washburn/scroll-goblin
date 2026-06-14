/**
 * Deterministic "DNA → music" engine.
 *
 * The core idea (so the output sounds composed rather than random): a sequence
 * never maps directly to absolute notes. Instead a hash of the sequence picks
 * the *rules* — key, scale, tempo, chord progression — and the amino acids are
 * then quantized into scale degrees within those rules, so almost every note
 * lands consonantly over the harmony.
 *
 * Everything is a pure function of (sequence, genre): the same input always
 * produces the same song, which is what makes the share links work.
 */

/** The 20 standard amino acids, single-letter codes. */
export const AMINO_ACIDS = "ACDEFGHIKLMNPQRSTVWY";

export type Property = "nonpolar" | "polar" | "positive" | "negative";

export interface AminoInfo {
  letter: string;
  name: string;
  property: Property;
  /** Scale degree (0-based) this amino acid maps to. */
  degree: number;
  /** Octave offset applied on top of the melody root. */
  octave: number;
  /** Note length in beats. */
  duration: number;
  /** Charged residues are accented (slightly louder). */
  accent: boolean;
  /** Display colour, by chemical property. */
  color: string;
}

export const PROPERTY_COLOR: Record<Property, string> = {
  nonpolar: "#f6b35f",
  polar: "#38bdf8",
  positive: "#fb7185",
  negative: "#a78bfa",
};

export const PROPERTY_LABEL: Record<Property, string> = {
  nonpolar: "Nonpolar",
  polar: "Polar",
  positive: "Positive",
  negative: "Negative",
};

/** Property drives octave, duration, and accent so chemistry shapes the music. */
const PROPERTY_MUSIC: Record<
  Property,
  { octave: number; duration: number; accent: boolean }
> = {
  nonpolar: { octave: 0, duration: 1, accent: false },
  polar: { octave: 0, duration: 0.5, accent: false },
  positive: { octave: 1, duration: 0.5, accent: true },
  negative: { octave: -1, duration: 1.5, accent: true },
};

const AA_TABLE: Array<[string, string, Property, number]> = [
  ["A", "Alanine", "nonpolar", 0],
  ["R", "Arginine", "positive", 1],
  ["N", "Asparagine", "polar", 3],
  ["D", "Aspartate", "negative", 2],
  ["C", "Cysteine", "polar", 5],
  ["E", "Glutamate", "negative", 6],
  ["Q", "Glutamine", "polar", 4],
  ["G", "Glycine", "nonpolar", 1],
  ["H", "Histidine", "positive", 3],
  ["I", "Isoleucine", "nonpolar", 7],
  ["L", "Leucine", "nonpolar", 5],
  ["K", "Lysine", "positive", 2],
  ["M", "Methionine", "nonpolar", 0],
  ["F", "Phenylalanine", "nonpolar", 4],
  ["P", "Proline", "nonpolar", 6],
  ["S", "Serine", "polar", 2],
  ["T", "Threonine", "polar", 5],
  ["V", "Valine", "nonpolar", 7],
  ["W", "Tryptophan", "nonpolar", 6],
  ["Y", "Tyrosine", "polar", 3],
];

export const AMINO_INFO: Record<string, AminoInfo> = Object.fromEntries(
  AA_TABLE.map(([letter, name, property, degree]) => {
    const m = PROPERTY_MUSIC[property];
    return [
      letter,
      {
        letter,
        name,
        property,
        degree,
        octave: m.octave,
        duration: m.duration,
        accent: m.accent,
        color: PROPERTY_COLOR[property],
      } satisfies AminoInfo,
    ];
  })
);

const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Pentatonic Minor": [0, 3, 5, 7, 10],
  Blues: [0, 3, 5, 6, 7, 10],
};

const MOOD: Record<string, string> = {
  Major: "Triumphant",
  Minor: "Melancholy",
  Dorian: "Wistful",
  Mixolydian: "Adventurous",
  Phrygian: "Ominous",
  Lydian: "Dreamy",
  "Harmonic Minor": "Mysterious",
  "Pentatonic Minor": "Brooding",
  Blues: "Gritty",
};

export type Groove = "straight" | "swing" | "driving";

export type Track = "melody" | "bass" | "chord";

export interface Genre {
  id: string;
  label: string;
  emoji: string;
  scales: string[];
  tempo: [number, number];
  /** Base octave (scientific pitch notation) for the melody root. */
  octave: number;
  waves: Record<Track, OscillatorType>;
  /** Chord progressions as 0-based scale-degree roots, one per bar. */
  progressions: number[][];
  groove: Groove;
}

export const GENRES: Record<string, Genre> = {
  classic: {
    id: "classic",
    label: "Classical",
    emoji: "🎻",
    scales: ["Major", "Minor", "Dorian", "Lydian"],
    tempo: [76, 112],
    octave: 4,
    waves: { melody: "triangle", bass: "sine", chord: "sine" },
    progressions: [
      [0, 4, 5, 3],
      [0, 5, 3, 4],
      [0, 3, 4, 4],
    ],
    groove: "straight",
  },
  jazz: {
    id: "jazz",
    label: "Jazz",
    emoji: "🎷",
    scales: ["Dorian", "Mixolydian", "Blues", "Minor"],
    tempo: [96, 138],
    octave: 4,
    waves: { melody: "triangle", bass: "sine", chord: "square" },
    progressions: [
      [1, 4, 0, 0],
      [0, 5, 1, 4],
      [1, 4, 0, 3],
    ],
    groove: "swing",
  },
  metal: {
    id: "metal",
    label: "Metal",
    emoji: "🤘",
    scales: ["Phrygian", "Harmonic Minor", "Minor"],
    tempo: [120, 176],
    octave: 3,
    waves: { melody: "sawtooth", bass: "sawtooth", chord: "sawtooth" },
    progressions: [
      [0, 5, 3, 4],
      [0, 1, 0, 4],
      [0, 4, 5, 4],
    ],
    groove: "driving",
  },
  goblin: {
    id: "goblin",
    label: "Goblin",
    emoji: "👺",
    scales: ["Blues", "Pentatonic Minor", "Phrygian", "Dorian"],
    tempo: [88, 150],
    octave: 4,
    waves: { melody: "square", bass: "triangle", chord: "square" },
    progressions: [
      [0, 3, 4, 0],
      [0, 4, 3, 4],
      [0, 0, 3, 4],
    ],
    groove: "straight",
  },
};

export const GENRE_IDS = ["classic", "jazz", "metal", "goblin"] as const;

const NAME_ADJ = [
  "Spectral",
  "Goblin",
  "Velvet",
  "Broken",
  "Golden",
  "Feral",
  "Midnight",
  "Electric",
  "Ancient",
  "Sticky",
  "Cosmic",
  "Drowsy",
  "Molten",
  "Hollow",
  "Sacred",
  "Crooked",
];

const NAME_NOUN = [
  "Helix",
  "Anthem",
  "Lament",
  "Groove",
  "Sonata",
  "Ritual",
  "Shuffle",
  "Hymn",
  "Frequency",
  "Mutation",
  "Waltz",
  "Pulse",
  "Codon",
  "Echo",
  "Strand",
  "Chorus",
];

export interface NoteEvent {
  /** Start time in beats from the song start. */
  time: number;
  /** Duration in beats. */
  dur: number;
  /** MIDI note number. */
  midi: number;
  track: Track;
  /** Peak gain for this voice. */
  gain: number;
}

export interface Song {
  title: string;
  genreId: string;
  genreLabel: string;
  genreEmoji: string;
  key: string;
  scaleName: string;
  mood: string;
  tempo: number;
  beatsPerBar: number;
  bars: number;
  totalBeats: number;
  events: NoteEvent[];
  waves: Record<Track, OscillatorType>;
  groove: Groove;
  /** Lowest/highest melody MIDI note, for the piano-roll layout. */
  melodyRange: { min: number; max: number };
  /** Number of amino acids actually sonified. */
  noteCount: number;
}

/** Longest sequence we turn into a song, to keep clips ~15–30s. */
export const MAX_NOTES = 64;

/** Strip anything that isn't a valid single-letter amino acid code. */
export function sanitizeSequence(input: string): string {
  return input
    .toUpperCase()
    .split("")
    .filter((ch) => AMINO_ACIDS.includes(ch))
    .join("");
}

/** Deterministic 32-bit FNV-1a hash. */
function hashSequence(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Resolve a (possibly out-of-range) scale degree to a MIDI note. */
function degreeToMidi(rootMidi: number, scale: number[], degree: number): number {
  const len = scale.length;
  const oct = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  return rootMidi + oct * 12 + scale[idx];
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

const BEATS_PER_BAR = 4;

/**
 * Build a song from an amino-acid sequence and a genre. Returns null when the
 * sequence contains no valid residues.
 */
export function generateSong(sequence: string, genreId: string): Song | null {
  const seq = sanitizeSequence(sequence).slice(0, MAX_NOTES);
  if (seq.length === 0) return null;

  const genre = GENRES[genreId] ?? GENRES.classic;
  const h = hashSequence(`${seq}|${genre.id}`);

  const rootPc = h % 12;
  const scaleName = genre.scales[(h >>> 4) % genre.scales.length];
  const scale = SCALES[scaleName];
  const span = genre.tempo[1] - genre.tempo[0] + 1;
  const tempo = genre.tempo[0] + ((h >>> 8) % span);
  const progression = genre.progressions[(h >>> 12) % genre.progressions.length];

  // MIDI 60 = C4, so root = 12 * (octave + 1) + pitch-class.
  const melodyRoot = 12 * (genre.octave + 1) + rootPc;
  const chordRoot = melodyRoot - 12;
  const bassRoot = melodyRoot - 24;

  const events: NoteEvent[] = [];

  // --- Melody: one note per amino acid, quantized into the chosen scale. ---
  let t = 0;
  let minMidi = Infinity;
  let maxMidi = -Infinity;
  for (const aa of seq) {
    const info = AMINO_INFO[aa];
    const midi = degreeToMidi(melodyRoot, scale, info.degree) + info.octave * 12;
    minMidi = Math.min(minMidi, midi);
    maxMidi = Math.max(maxMidi, midi);
    events.push({
      time: t,
      dur: info.duration,
      midi,
      track: "melody",
      gain: info.accent ? 0.2 : 0.16,
    });
    t += info.duration;
  }

  const bars = Math.max(1, Math.ceil(t / BEATS_PER_BAR));
  const totalBeats = bars * BEATS_PER_BAR;

  // --- Harmony + bass: a repeating progression underneath the melody. ---
  for (let b = 0; b < bars; b++) {
    const degree = progression[b % progression.length];
    const barStart = b * BEATS_PER_BAR;

    // Sustained triad pad for the whole bar.
    for (const cd of [degree, degree + 2, degree + 4]) {
      events.push({
        time: barStart,
        dur: BEATS_PER_BAR * 0.95,
        midi: degreeToMidi(chordRoot, scale, cd),
        track: "chord",
        gain: 0.05,
      });
    }

    // Root then fifth gives the bar a gentle walking bass.
    events.push({
      time: barStart,
      dur: BEATS_PER_BAR * 0.5,
      midi: degreeToMidi(bassRoot, scale, degree),
      track: "bass",
      gain: 0.22,
    });
    events.push({
      time: barStart + BEATS_PER_BAR * 0.5,
      dur: BEATS_PER_BAR * 0.5,
      midi: degreeToMidi(bassRoot, scale, degree + 4),
      track: "bass",
      gain: 0.18,
    });
  }

  const title = `${NAME_ADJ[(h >>> 16) % NAME_ADJ.length]} ${
    NAME_NOUN[(h >>> 20) % NAME_NOUN.length]
  }`;

  return {
    title,
    genreId: genre.id,
    genreLabel: genre.label,
    genreEmoji: genre.emoji,
    key: `${NOTE_NAMES[rootPc]} ${scaleName}`,
    scaleName,
    mood: MOOD[scaleName] ?? "Curious",
    tempo,
    beatsPerBar: BEATS_PER_BAR,
    bars,
    totalBeats,
    events,
    waves: genre.waves,
    groove: genre.groove,
    melodyRange: { min: minMidi, max: maxMidi },
    noteCount: seq.length,
  };
}
