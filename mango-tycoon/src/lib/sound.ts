// Web Audio API synthesized sounds — no files needed
let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  // Resume if suspended (autoplay policy)
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.25, delay = 0) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    const t = ctx.currentTime + delay
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(vol, t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.start(t)
    osc.stop(t + dur + 0.05)
  } catch {
    // Silently ignore if audio not supported
  }
}

function arp(notes: number[], dur: number, gap = 0.08, type: OscillatorType = 'sine', vol = 0.2) {
  notes.forEach((f, i) => tone(f, dur, type, vol, i * gap))
}

const S = {
  // Buy asset: upward coin jingle
  buy: () => arp([523, 659, 784, 1047], 0.12, 0.07, 'sine', 0.22),

  // Sell: gentle descending
  sell: () => arp([784, 659, 523], 0.1, 0.07, 'sine', 0.18),

  // Complete objective: short fanfare
  complete: () => {
    arp([523, 659, 784], 0.1, 0.07, 'sine', 0.2)
    setTimeout(() => arp([784, 1047, 1319], 0.18, 0.06, 'sine', 0.22), 240)
  },

  // Lesson complete: success chime
  lesson: () => {
    tone(880, 0.15, 'sine', 0.2)
    tone(1100, 0.12, 'sine', 0.18, 0.12)
    tone(1320, 0.25, 'sine', 0.22, 0.22)
  },

  // Passive income: coin shower
  income: () => {
    ;[0, 60, 120, 180].forEach((d, i) =>
      tone(1047 + i * 120, 0.08, 'sine', 0.15, d / 1000),
    )
  },

  // Economy event alert: punchy ping
  event: () => {
    tone(440, 0.08, 'square', 0.12)
    tone(880, 0.15, 'sine', 0.18, 0.08)
  },

  // Level up: triumphant arpeggio
  levelUp: () => {
    arp([262, 330, 392, 523, 659, 784, 1047], 0.14, 0.07, 'sine', 0.22)
    setTimeout(() => tone(1319, 0.4, 'sine', 0.25), 520)
  },

  // Error / locked
  error: () => {
    tone(200, 0.15, 'sawtooth', 0.18)
    tone(160, 0.2, 'sawtooth', 0.14, 0.1)
  },

  // UI click
  click: () => tone(800, 0.04, 'sine', 0.08),

  // Navigation
  nav: () => tone(600, 0.05, 'sine', 0.07),

  // Found company: epic chord
  company: () => {
    ;[261, 329, 392, 523].forEach((f, i) => tone(f, 0.4, 'sine', 0.16, i * 0.03))
    setTimeout(() => arp([523, 659, 784, 1047, 1319], 0.15, 0.06, 'sine', 0.2), 300)
  },
}

export default S
