// Synthesised sound for The Amber Gallery: no audio files, everything is
// generated with the Web Audio API so the game stays fully offline.

let ctx = null;
let muted = false;

export function ensureAudio() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  pickup() { tone(880, 0.12, 'sine', 0.12); tone(1318, 0.18, 'sine', 0.10, 0.07); },
  starPickup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.08)); },
  coin() { tone(1568, 0.08, 'square', 0.05); },
  smoke() { tone(300, 0.35, 'sawtooth', 0.05, 0, 90); },
  emp() { tone(1200, 0.3, 'square', 0.06, 0, 120); tone(90, 0.4, 'sine', 0.10, 0.05); },
  spotted() { tone(220, 0.25, 'square', 0.10); tone(233, 0.3, 'square', 0.10, 0.12); },
  caught() { [392, 311, 233, 175].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.09, i * 0.14)); },
  alarm() { tone(660, 0.15, 'square', 0.07); tone(520, 0.15, 'square', 0.07, 0.16); },
  door() { tone(440, 0.1, 'triangle', 0.09); tone(660, 0.16, 'triangle', 0.09, 0.09); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.11, i * 0.11)); },
  click() { tone(700, 0.05, 'square', 0.05); },
};

export function toggleMute() { muted = !muted; return muted; }
