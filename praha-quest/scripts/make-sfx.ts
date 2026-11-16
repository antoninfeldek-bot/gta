/**
 * Synthesises the three short reward sounds into assets/sfx/*.wav.
 *   npx tsx scripts/make-sfx.ts
 * Pure tones with soft envelopes: a glassy blip for new territory, a bell
 * arpeggio for claiming a place, and a small brass-like fanfare for level-ups.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RATE = 22_050;
const OUT = resolve(__dirname, '../assets/sfx');

type Note = { freq: number; start: number; dur: number; gain: number; harmonics?: number[] };

function render(notes: Note[], total: number): Buffer {
  const n = Math.round(total * RATE);
  const samples = new Float32Array(n);
  for (const note of notes) {
    const harmonics = note.harmonics ?? [1];
    const s0 = Math.round(note.start * RATE);
    const len = Math.round(note.dur * RATE);
    for (let i = 0; i < len && s0 + i < n; i++) {
      const t = i / RATE;
      const attack = Math.min(1, t / 0.008);
      const env = attack * Math.exp((-4.5 * t) / note.dur);
      let v = 0;
      harmonics.forEach((h, k) => (v += (h * Math.sin(2 * Math.PI * note.freq * (k + 1) * t)) / (k + 1)));
      samples[s0 + i] += v * env * note.gain;
    }
  }
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32_000), i * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(OUT, { recursive: true });
const bell = [1, 0.5, 0.25, 0.12];
writeFileSync(`${OUT}/reveal.wav`, render([{ freq: 1318.5, start: 0, dur: 0.18, gain: 0.35, harmonics: [1, 0.3] }, { freq: 1975.5, start: 0.05, dur: 0.2, gain: 0.25 }], 0.3));
writeFileSync(
  `${OUT}/claim.wav`,
  render(
    [659.3, 830.6, 987.8, 1318.5].map((freq, i) => ({ freq, start: i * 0.07, dur: 0.6, gain: 0.3, harmonics: bell })),
    0.95,
  ),
);
writeFileSync(
  `${OUT}/level.wav`,
  render(
    [
      { freq: 392, start: 0, dur: 0.25, gain: 0.3, harmonics: [1, 0.6, 0.4, 0.2] },
      { freq: 523.3, start: 0.16, dur: 0.25, gain: 0.3, harmonics: [1, 0.6, 0.4, 0.2] },
      { freq: 659.3, start: 0.32, dur: 0.3, gain: 0.3, harmonics: [1, 0.6, 0.4, 0.2] },
      { freq: 784, start: 0.5, dur: 0.9, gain: 0.35, harmonics: [1, 0.6, 0.4, 0.2] },
      { freq: 1046.5, start: 0.5, dur: 0.9, gain: 0.18, harmonics: bell },
    ],
    1.5,
  ),
);
console.log('Wrote reveal.wav, claim.wav, level.wav');
