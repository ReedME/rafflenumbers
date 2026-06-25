// Synthesised flip sounds via the Web Audio API — no audio files, so it works
// offline. A short "tick" per flip and a lower "thunk" as each reel locks.

let actx = null

function getCtx() {
  if (typeof window === 'undefined') return null
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    actx = new AC()
  }
  return actx
}

// Call from a user gesture (the Draw click) so the browser allows audio
export function primeAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume()
}

function blip({ type, from, to, peak, attack, release }) {
  const c = getCtx()
  if (!c || c.state !== 'running') return
  const t = c.currentTime
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t)
  osc.frequency.exponentialRampToValueAtTime(to, t + attack + release)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + attack + release + 0.02)
}

// Light mechanical tick — one per flip step
export function playTick() {
  blip({ type: 'square', from: 820, to: 360, peak: 0.07, attack: 0.004, release: 0.045 })
}

// Heavier thunk — a reel landing on its digit
export function playLock() {
  blip({ type: 'triangle', from: 300, to: 110, peak: 0.16, attack: 0.005, release: 0.13 })
}
