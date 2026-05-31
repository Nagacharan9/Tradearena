// Web Audio API sound effects — no external files needed
const AudioCtx = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null

let ctx = null
let muted = false

function getCtx() {
  if (!ctx && AudioCtx) ctx = new AudioCtx()
  return ctx
}

function playTone(freq, duration = 0.15, type = 'sine', volume = 0.3) {
  if (muted) return
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration)
}

export const sounds = {
  click: () => playTone(800, 0.05, 'sine', 0.1),

  tradePlace: () => {
    playTone(440, 0.1, 'sine', 0.2)
    setTimeout(() => playTone(660, 0.1, 'sine', 0.2), 80)
  },

  tradeWin: () => {
    playTone(523, 0.12, 'sine', 0.25)
    setTimeout(() => playTone(659, 0.12, 'sine', 0.25), 100)
    setTimeout(() => playTone(784, 0.2, 'sine', 0.25), 200)
  },

  tradeLoss: () => {
    playTone(400, 0.15, 'sawtooth', 0.15)
    setTimeout(() => playTone(300, 0.25, 'sawtooth', 0.1), 150)
  },

  notification: () => {
    playTone(880, 0.08, 'sine', 0.15)
    setTimeout(() => playTone(1100, 0.08, 'sine', 0.15), 80)
  },

  rankUp: () => {
    playTone(523, 0.1, 'sine', 0.2)
    setTimeout(() => playTone(659, 0.1, 'sine', 0.2), 100)
    setTimeout(() => playTone(784, 0.1, 'sine', 0.2), 200)
    setTimeout(() => playTone(1047, 0.2, 'sine', 0.25), 300)
  },

  countdown: () => playTone(600, 0.08, 'square', 0.1),

  join: () => {
    playTone(500, 0.05, 'sine', 0.1)
    setTimeout(() => playTone(700, 0.1, 'sine', 0.15), 60)
  },
}

export function toggleMute() {
  muted = !muted
  return muted
}

export function isMuted() {
  return muted
}
