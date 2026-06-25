'use client'

import { useState, useEffect, useRef } from 'react'

function PoweredBy() {
  return (
    <a
      className="powered"
      href="https://propellorsoft.com"
      target="_blank"
      rel="noopener noreferrer"
    >
      Powered by <span className="powered-brand">PropellorSoft</span>
    </a>
  )
}

// A single split-flap reel. Whenever `value` changes it runs a real fold:
// the old digit's top panel folds down while the new digit's bottom folds in.
function FlapDigit({ value }) {
  const v = String(value)
  const [flip, setFlip] = useState({ prev: v, curr: v, animating: false, id: 0 })
  const prevRef = useRef(v)

  useEffect(() => {
    if (v !== prevRef.current) {
      setFlip((f) => ({ prev: prevRef.current, curr: v, animating: true, id: f.id + 1 }))
      prevRef.current = v
    }
  }, [v])

  // Once the fold lands, the bottom static panel adopts the new digit
  const settle = () => setFlip((f) => ({ ...f, prev: f.curr, animating: false }))

  return (
    <span className="flap-stack">
      <span className="flap-half flap-half--top">
        <span className="flap-glyph">{flip.curr}</span>
      </span>
      <span className="flap-half flap-half--bottom">
        <span className="flap-glyph">{flip.prev}</span>
      </span>
      {flip.animating && (
        <span className="flap-folds" key={flip.id}>
          <span className="flap-half flap-fold flap-fold--top">
            <span className="flap-glyph">{flip.prev}</span>
          </span>
          <span
            className="flap-half flap-fold flap-fold--bottom"
            onAnimationEnd={settle}
          >
            <span className="flap-glyph">{flip.curr}</span>
          </span>
        </span>
      )}
    </span>
  )
}

export default function Home() {
  const [raffleName, setRaffleName] = useState('')
  const [minNumber, setMinNumber] = useState('1')
  const [maxNumber, setMaxNumber] = useState('100')
  const [isRaffleActive, setIsRaffleActive] = useState(false)
  const [drawnNumbers, setDrawnNumbers] = useState([])
  const [currentDisplay, setCurrentDisplay] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [historicalRaffles, setHistoricalRaffles] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  // Per-digit reveal slots: [{ char: '?' | 0-9, locked: bool }]
  const [revealDigits, setRevealDigits] = useState([])

  // Venue settings (persisted to localStorage)
  const [settings, setSettings] = useState({
    venueName: 'LHIBC',
    defaultMin: '1',
    defaultMax: '100',
    revealDirection: 'rtl', // 'rtl' = right-to-left, 'ltr' = left-to-right
  })
  const [showSettings, setShowSettings] = useState(false)
  const [draftSettings, setDraftSettings] = useState(settings)

  const isDrawingRef = useRef(false)
  const revealTimersRef = useRef([])
  const scrambleIntervalRef = useRef(null)

  // Load historical raffles from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('historicalRaffles')
    if (saved) {
      try {
        setHistoricalRaffles(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading historical raffles:', e)
      }
    }
  }, [])

  // Save historical raffles to localStorage whenever it changes
  useEffect(() => {
    if (historicalRaffles.length > 0) {
      localStorage.setItem('historicalRaffles', JSON.stringify(historicalRaffles))
    }
  }, [historicalRaffles])

  // Load venue settings on mount and seed the ticket range from them
  useEffect(() => {
    const saved = localStorage.getItem('raffleSettings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings((prev) => ({ ...prev, ...parsed }))
        if (parsed.defaultMin) setMinNumber(String(parsed.defaultMin))
        if (parsed.defaultMax) setMaxNumber(String(parsed.defaultMax))
      } catch (e) {
        console.error('Error loading settings:', e)
      }
    }
  }, [])

  // Keep the browser tab title in sync with the venue
  useEffect(() => {
    if (settings.venueName) {
      document.title = `${settings.venueName} Raffles`
    }
  }, [settings.venueName])

  // Close the settings panel on Escape
  useEffect(() => {
    if (!showSettings) return
    const onKey = (e) => {
      if (e.key === 'Escape') setShowSettings(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showSettings])

  const openSettings = () => {
    setDraftSettings(settings)
    setShowSettings(true)
  }

  const saveSettings = () => {
    const cleanInt = (value, fallback) => {
      const n = parseInt(value)
      return isNaN(n) ? fallback : String(n)
    }
    const next = {
      venueName: draftSettings.venueName.trim() || 'LHIBC',
      defaultMin: cleanInt(draftSettings.defaultMin, '1'),
      defaultMax: cleanInt(draftSettings.defaultMax, '100'),
      revealDirection: draftSettings.revealDirection === 'ltr' ? 'ltr' : 'rtl',
    }
    setSettings(next)
    localStorage.setItem('raffleSettings', JSON.stringify(next))
    // Apply the new defaults to the setup form (we're not mid-raffle here)
    setMinNumber(next.defaultMin)
    setMaxNumber(next.defaultMax)
    setShowSettings(false)
  }

  const startRaffle = () => {
    if (!raffleName.trim()) {
      alert('Please enter a raffle name')
      return
    }

    const min = parseInt(minNumber) || 1
    const max = parseInt(maxNumber) || 100

    if (isNaN(min) || isNaN(max)) {
      alert('Please enter valid numbers')
      return
    }

    if (min >= max) {
      alert('Min number must be less than max number')
      return
    }

    setIsRaffleActive(true)
    setDrawnNumbers([])
    setCurrentDisplay(null)
    setRevealDigits([])
    isDrawingRef.current = false
    setIsDrawing(false)
  }

  // Clear any pending reveal timers / scramble loop
  const clearRevealTimers = () => {
    revealTimersRef.current.forEach((t) => clearTimeout(t))
    revealTimersRef.current = []
    if (scrambleIntervalRef.current) {
      clearInterval(scrambleIntervalRef.current)
      scrambleIntervalRef.current = null
    }
  }

  const drawNumber = () => {
    // Check both state and ref to prevent race conditions
    if (isDrawing || isDrawingRef.current) return

    // Set drawing flag immediately using ref to prevent double-clicks
    isDrawingRef.current = true
    setIsDrawing(true)
    setCurrentDisplay(null)

    // Parse min and max numbers
    const min = parseInt(minNumber) || 1
    const max = parseInt(maxNumber) || 100

    // Get current drawn numbers using functional update to ensure we have latest state
    setDrawnNumbers((currentDrawn) => {
      const drawnSet = new Set(currentDrawn)

      // Build available numbers array (numbers not yet drawn)
      const availableNumbers = []
      for (let i = min; i <= max; i++) {
        if (!drawnSet.has(i)) {
          availableNumbers.push(i)
        }
      }

      if (availableNumbers.length === 0) {
        alert('All numbers have been drawn!')
        isDrawingRef.current = false
        setIsDrawing(false)
        return currentDrawn
      }

      // Pick the winning number up front so we can reveal its digits one by one
      const finalNumber =
        availableNumbers[Math.floor(Math.random() * availableNumbers.length)]

      // One reel per digit of the largest ticket, so every draw shows the same
      // number of reels. The winner is zero-padded to fit (e.g. max 2000 → "0084").
      const slotCount = String(Math.max(1, max)).length
      const finalDigits = String(finalNumber).padStart(slotCount, '0').split('')

      // Every reel starts spinning at once; they lock one at a time, right to left
      setRevealDigits(
        finalDigits.map(() => ({
          char: String(Math.floor(Math.random() * 10)),
          locked: false,
        }))
      )
      revealDigitsSequentially(finalDigits, finalNumber)

      return currentDrawn
    })
  }

  // Spin every reel at once, then lock them one at a time from right to left.
  // Each successive reel takes a little longer to stop, so the final (left-most)
  // reel holds the longest for the climax.
  const revealDigitsSequentially = (finalDigits, finalNumber) => {
    clearRevealTimers()

    const lockedSlots = new Set()

    // All not-yet-locked reels step through digits together, one flip at a time
    scrambleIntervalRef.current = setInterval(() => {
      setRevealDigits((prev) =>
        prev.map((slot, idx) =>
          lockedSlots.has(idx)
            ? slot
            : { char: String((parseInt(slot.char, 10) + 1) % 10), locked: false }
        )
      )
    }, 230)

    // Lock order follows the venue's reveal-direction setting.
    // 'rtl' (default): right-most reel stops first, working leftward.
    // 'ltr': left-most reel stops first, working rightward.
    const order = finalDigits.map((_, idx) => idx)
    if (settings.revealDirection !== 'ltr') order.reverse()

    let elapsed = 900 // first reel stops after a beat
    order.forEach((slotIdx, step) => {
      const lockTimer = setTimeout(() => {
        lockedSlots.add(slotIdx)
        setRevealDigits((prev) =>
          prev.map((slot, idx) =>
            idx === slotIdx
              ? { char: finalDigits[slotIdx], locked: true }
              : slot
          )
        )

        // Last reel locked — stop the shuffle and commit the winner
        if (step === order.length - 1) {
          if (scrambleIntervalRef.current) {
            clearInterval(scrambleIntervalRef.current)
            scrambleIntervalRef.current = null
          }
          const done = setTimeout(() => finishDraw(finalNumber), 400)
          revealTimersRef.current.push(done)
        }
      }, elapsed)
      revealTimersRef.current.push(lockTimer)
      elapsed += 550 + step * 160
    })
  }

  // Commit the winning number once every digit has been revealed
  const finishDraw = (finalNumber) => {
    clearRevealTimers()

    setDrawnNumbers((prevDrawn) => {
      // Guard against double-commit / state drift
      if (prevDrawn.includes(finalNumber)) {
        return prevDrawn
      }
      return [...prevDrawn, finalNumber]
    })

    setCurrentDisplay(finalNumber)
    setRevealDigits([])
    isDrawingRef.current = false
    setIsDrawing(false)
  }

  const endRaffle = () => {
    // Cancel any in-progress digit reveal
    clearRevealTimers()

    // Reset drawing state
    isDrawingRef.current = false
    setIsDrawing(false)
    setRevealDigits([])

    // Save to historical raffles
    if (raffleName && drawnNumbers.length > 0) {
      const raffleData = {
        id: Date.now(),
        name: raffleName,
        minNumber: parseInt(minNumber) || 1,
        maxNumber: parseInt(maxNumber) || 100,
        drawnNumbers: [...drawnNumbers],
        date: new Date().toISOString()
      }
      setHistoricalRaffles(prev => [...prev, raffleData])
    }

    // Reset state
    setIsRaffleActive(false)
    setRaffleName('')
    setMinNumber('1')
    setMaxNumber('100')
    setDrawnNumbers([])
    setCurrentDisplay(null)
    isDrawingRef.current = false
    setIsDrawing(false)
  }

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all historical raffles?')) {
      setHistoricalRaffles([])
      localStorage.removeItem('historicalRaffles')
    }
  }

  // Total tickets in the configured range (for the "x of y" drawn counter)
  const totalTickets = Math.max(
    0,
    (parseInt(maxNumber) || 0) - (parseInt(minNumber) || 0) + 1
  )

  // Reels = digits in the largest ticket, so every draw shows the same board
  const ticketWidth = String(Math.max(1, parseInt(maxNumber) || 1)).length

  // What the flap board shows right now: the live reveal, the resting winner, or an idle board
  const boardCards = isDrawing
    ? revealDigits.map((slot, idx) => ({
        key: idx,
        char: slot.char,
        state: slot.locked ? 'locked' : 'rolling',
      }))
    : currentDisplay !== null
      ? String(currentDisplay)
          .padStart(ticketWidth, '0')
          .split('')
          .map((char, idx) => ({ key: idx, char, state: 'winner' }))
      : Array.from({ length: ticketWidth }, (_, idx) => ({
          key: idx,
          char: '–',
          state: 'ghost',
        }))

  const eyebrow = isDrawing
    ? 'Drawing…'
    : currentDisplay !== null
      ? 'Winning ticket'
      : 'Press draw to begin'

  return (
    <div className="app">
      {!isRaffleActive ? (
        <div className="setup">
          <button
            onClick={openSettings}
            className="settings-cog"
            aria-label="Venue settings"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.14 12.94a7.49 7.49 0 0 0 .05-.94 7.49 7.49 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.31 8.84a.5.5 0 0 0 .12.64l2.03 1.58a7.49 7.49 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96a7 7 0 0 0 1.62.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </button>

          <div className="setup-inner">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">{settings.venueName}</span>
            </div>
            <h1 className="setup-title">Raffle draw</h1>
            <p className="setup-sub">
              Set the ticket range, then reveal each winning number one digit at a time.
            </p>

            <div className="ticket-card">
              <div className="field-group">
                <label htmlFor="raffleName" className="field-label">
                  Raffle name
                </label>
                <input
                  id="raffleName"
                  type="text"
                  value={raffleName}
                  onChange={(e) => setRaffleName(e.target.value)}
                  placeholder="e.g. Friday meat tray"
                  className="field"
                  autoComplete="off"
                />
              </div>

              <div className="range-row">
                <div className="field-group">
                  <label htmlFor="minNumber" className="field-label">
                    Tickets from
                  </label>
                  <input
                    id="minNumber"
                    type="number"
                    inputMode="numeric"
                    value={minNumber}
                    onChange={(e) => setMinNumber(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      if (value === '' || isNaN(parseInt(value))) {
                        setMinNumber('1')
                      } else {
                        setMinNumber(value)
                      }
                    }}
                    className="field"
                  />
                </div>
                <span className="range-sep" aria-hidden="true">
                  –
                </span>
                <div className="field-group">
                  <label htmlFor="maxNumber" className="field-label">
                    to
                  </label>
                  <input
                    id="maxNumber"
                    type="number"
                    inputMode="numeric"
                    value={maxNumber}
                    onChange={(e) => setMaxNumber(e.target.value)}
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      if (value === '' || isNaN(parseInt(value))) {
                        setMaxNumber('100')
                      } else {
                        setMaxNumber(value)
                      }
                    }}
                    className="field"
                  />
                </div>
              </div>

              <button onClick={startRaffle} className="btn btn--start">
                Start raffle
              </button>
            </div>

            {historicalRaffles.length > 0 && (
              <div className="history">
                <div className="history-controls">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="btn btn--ghost"
                  >
                    {showHistory ? 'Hide' : 'Show'} past draws ({historicalRaffles.length})
                  </button>
                  {showHistory && (
                    <button onClick={clearHistory} className="btn btn--ghost btn--danger">
                      Clear
                    </button>
                  )}
                </div>

                {showHistory && (
                  <div className="history-list">
                    {historicalRaffles
                      .slice()
                      .reverse()
                      .map((raffle) => (
                        <div key={raffle.id} className="history-item">
                          <div className="history-item-top">
                            <span className="history-name">{raffle.name}</span>
                            <span className="history-date">
                              {new Date(raffle.date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="history-meta">
                            Tickets {raffle.minNumber}–{raffle.maxNumber} ·{' '}
                            {raffle.drawnNumbers.length} drawn
                          </div>
                          <div className="history-nums">
                            {raffle.drawnNumbers.join('   ·   ')}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            <PoweredBy />
          </div>

          {showSettings && (
            <div
              className="modal-overlay"
              onClick={() => setShowSettings(false)}
            >
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-label="Venue settings"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="modal-head">
                  <h2 className="modal-title">Venue settings</h2>
                  <p className="modal-sub">Saved on this device.</p>
                </div>

                <div className="field-group">
                  <label htmlFor="venueName" className="field-label">
                    Venue name
                  </label>
                  <input
                    id="venueName"
                    type="text"
                    value={draftSettings.venueName}
                    onChange={(e) =>
                      setDraftSettings((d) => ({ ...d, venueName: e.target.value }))
                    }
                    placeholder="e.g. The Royal Hotel"
                    className="field"
                    autoComplete="off"
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="defaultMin" className="field-label">
                    Default ticket range
                  </label>
                  <div className="range-row">
                    <input
                      id="defaultMin"
                      type="number"
                      inputMode="numeric"
                      aria-label="From"
                      value={draftSettings.defaultMin}
                      onChange={(e) =>
                        setDraftSettings((d) => ({ ...d, defaultMin: e.target.value }))
                      }
                      className="field"
                    />
                    <span className="range-sep" aria-hidden="true">
                      –
                    </span>
                    <input
                      id="defaultMax"
                      type="number"
                      inputMode="numeric"
                      aria-label="To"
                      value={draftSettings.defaultMax}
                      onChange={(e) =>
                        setDraftSettings((d) => ({ ...d, defaultMax: e.target.value }))
                      }
                      className="field"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Reveal direction</label>
                  <div className="segmented" role="group" aria-label="Reveal direction">
                    <button
                      type="button"
                      className={`seg${
                        draftSettings.revealDirection !== 'ltr' ? ' seg--on' : ''
                      }`}
                      aria-pressed={draftSettings.revealDirection !== 'ltr'}
                      onClick={() =>
                        setDraftSettings((d) => ({ ...d, revealDirection: 'rtl' }))
                      }
                    >
                      Right to left
                    </button>
                    <button
                      type="button"
                      className={`seg${
                        draftSettings.revealDirection === 'ltr' ? ' seg--on' : ''
                      }`}
                      aria-pressed={draftSettings.revealDirection === 'ltr'}
                      onClick={() =>
                        setDraftSettings((d) => ({ ...d, revealDirection: 'ltr' }))
                      }
                    >
                      Left to right
                    </button>
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="btn btn--ghost"
                  >
                    Cancel
                  </button>
                  <button onClick={saveSettings} className="btn btn--start modal-save">
                    Save settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="stage">
          <header className="topbar">
            <div className="brand">
              <span className="brand-mark" aria-hidden="true" />
              <span className="brand-name">{settings.venueName}</span>
            </div>
            <div className="topbar-center">
              <span className="topbar-title">{raffleName}</span>
              <span className="range-chip">
                Tickets {minNumber}–{maxNumber}
              </span>
            </div>
            <button onClick={endRaffle} className="btn btn--ghost end-btn">
              End raffle
            </button>
          </header>

          <main className="board-area">
            <span className="eyebrow">{eyebrow}</span>
            <div
              className={`flapboard${
                currentDisplay !== null && !isDrawing ? ' is-winner' : ''
              }`}
              style={{ '--cols': boardCards.length }}
            >
              {boardCards.map((card) => (
                <span key={card.key} className={`flap flap--${card.state}`}>
                  <FlapDigit value={card.char} />
                </span>
              ))}
            </div>
            <button
              onClick={drawNumber}
              disabled={isDrawing}
              className="btn btn--draw"
            >
              {isDrawing
                ? 'Drawing…'
                : drawnNumbers.length
                  ? 'Draw next ticket'
                  : 'Draw ticket'}
            </button>
          </main>

          <footer className="drawn">
            <div className="drawn-head">
              <span className="drawn-label">Drawn</span>
              <span className="drawn-count">
                {drawnNumbers.length} of {totalTickets}
              </span>
            </div>
            <div className="stub-rail">
              {drawnNumbers.length > 0 ? (
                drawnNumbers
                  .slice()
                  .reverse()
                  .map((num, index) => (
                    <span
                      key={num}
                      className={`stub${index === 0 ? ' stub--latest' : ''}`}
                    >
                      {num}
                    </span>
                  ))
              ) : (
                <span className="stub-empty">No tickets drawn yet</span>
              )}
            </div>
          </footer>

          <PoweredBy />
        </div>
      )}
    </div>
  )
}
