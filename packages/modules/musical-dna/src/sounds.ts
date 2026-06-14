/**
 * Plays a generated Song through the shared @scroll-goblin/ui audio bus, so the
 * global mute toggle applies. Every voice is a synthesized oscillator with a
 * simple ADSR-ish gain envelope; a light percussion groove is layered on top to
 * make the output feel intentional rather than like floating tones.
 *
 * Songs are short, so all events are scheduled up front. `stop()` fades the
 * song's master gain and halts every scheduled oscillator.
 */

import { getAudioBus, getNoiseBuffer } from "@scroll-goblin/ui";
import { midiToFreq, type Song, type Track } from "./music";

export interface Playback {
  /** Total length of the clip in seconds (including release tail). */
  durationSec: number;
  /**
   * Playback position 0..1, measured against the AudioContext clock so the
   * UI playhead stays in lockstep with what's actually sounding. Scaled over
   * the musical length only (the release tail is excluded).
   */
  progress(): number;
  stop(): void;
}

function voice(
  ac: AudioContext,
  out: AudioNode,
  type: OscillatorType,
  freq: number,
  start: number,
  dur: number,
  peak: number,
  track: Track
): OscillatorNode {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  const attack = track === "chord" ? 0.05 : 0.012;
  const release = track === "chord" ? 0.3 : track === "bass" ? 0.12 : 0.09;

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + attack);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * 0.6),
    start + Math.max(attack + 0.01, dur * 0.6)
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + release);

  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + dur + release + 0.02);
  return osc;
}

function kick(ac: AudioContext, out: AudioNode, start: number): void {
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(140, start);
  osc.frequency.exponentialRampToValueAtTime(45, start + 0.12);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.3, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
  osc.connect(gain).connect(out);
  osc.start(start);
  osc.stop(start + 0.2);
}

function hat(
  ac: AudioContext,
  out: AudioNode,
  buffer: AudioBuffer,
  start: number,
  level: number
): void {
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 7500;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(level, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.05);
  src.connect(filter).connect(gain).connect(out);
  src.start(start);
  src.stop(start + 0.06);
}

export function playSong(song: Song, onEnd: () => void): Playback {
  const { ctx: ac, out } = getAudioBus();
  const spb = 60 / song.tempo;
  const start = ac.currentTime + 0.08;

  const master = ac.createGain();
  master.gain.value = 1;
  master.connect(out);

  const oscillators: OscillatorNode[] = [];
  for (const ev of song.events) {
    oscillators.push(
      voice(
        ac,
        master,
        song.waves[ev.track],
        midiToFreq(ev.midi),
        start + ev.time * spb,
        ev.dur * spb,
        ev.gain,
        ev.track
      )
    );
  }

  // --- Percussion groove, derived from the song's tempo grid. ---
  const noise = getNoiseBuffer(ac);
  const swing = song.groove === "swing" ? spb * 0.16 : 0;
  for (let b = 0; b < song.bars; b++) {
    for (let beat = 0; beat < song.beatsPerBar; beat++) {
      const beatStart = start + (b * song.beatsPerBar + beat) * spb;
      if (beat === 0 || beat === 2) kick(ac, master, beatStart);
      hat(ac, master, noise, beatStart, 0.05);
      hat(ac, master, noise, beatStart + spb * 0.5 + swing, 0.032);
      if (song.groove === "driving") {
        hat(ac, master, noise, beatStart + spb * 0.25, 0.022);
        hat(ac, master, noise, beatStart + spb * 0.75, 0.022);
      }
    }
  }

  const musicalSec = song.totalBeats * spb;
  const durationSec = musicalSec + 0.6;
  let stopped = false;
  const timer = window.setTimeout(() => {
    if (!stopped) onEnd();
  }, durationSec * 1000);

  return {
    durationSec,
    progress() {
      // `start` already includes the scheduling offset, so the line sits at 0
      // until the first note actually sounds, then tracks the audio clock.
      return Math.max(0, Math.min(1, (ac.currentTime - start) / musicalSec));
    },
    stop() {
      if (stopped) return;
      stopped = true;
      window.clearTimeout(timer);
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setTargetAtTime(0, now, 0.04);
      for (const osc of oscillators) {
        try {
          osc.stop(now + 0.2);
        } catch {
          /* already stopped */
        }
      }
    },
  };
}
