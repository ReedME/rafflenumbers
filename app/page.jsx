'use client'

import { useState, useEffect, useRef } from 'react'

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

  const animationRef = useRef(null)
  const startTimeRef = useRef(null)
  const availableNumbersRef = useRef([])
  const isDrawingRef = useRef(false)
  const lastUpdateTimeRef = useRef(0)

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
    isDrawingRef.current = false
    setIsDrawing(false)
  }

  const drawNumber = () => {
    // Check both state and ref to prevent race conditions
    if (isDrawing || isDrawingRef.current) return

    // Set drawing flag immediately using ref to prevent double-clicks
    isDrawingRef.current = true
    setIsDrawing(true)

    // Parse min and max numbers
    const min = parseInt(minNumber) || 1
    const max = parseInt(maxNumber) || 100

    // Get current drawn numbers using functional update to ensure we have latest state
    setDrawnNumbers(currentDrawn => {
      // Create a Set for O(1) lookup performance
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

      // Store available numbers in ref for use in animation
      availableNumbersRef.current = [...availableNumbers]

      setCurrentDisplay(null)

      const duration = 4000 + Math.random() * 3000 // 4-7 seconds
      const startTime = Date.now()
      startTimeRef.current = startTime
      lastUpdateTimeRef.current = startTime
      const updateInterval = 50 // Update display every 150ms (slower scroll speed)

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const now = Date.now()

        // Only update display if enough time has passed (throttle for slower scroll)
        if (now - lastUpdateTimeRef.current >= updateInterval) {
          // Random number from available pool for animation display
          const available = availableNumbersRef.current
          const randomIndex = Math.floor(Math.random() * available.length)
          const displayNumber = available[randomIndex]
          setCurrentDisplay(displayNumber)
          lastUpdateTimeRef.current = now
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          // Final number selection - recalculate available numbers using latest state
          // to ensure no duplicates even if state changed during animation
          setDrawnNumbers(prevDrawn => {
            const finalDrawnSet = new Set(prevDrawn)
            const finalAvailable = []
            // Re-parse min/max in case they changed
            const currentMin = parseInt(minNumber) || 1
            const currentMax = parseInt(maxNumber) || 100
            for (let i = currentMin; i <= currentMax; i++) {
              if (!finalDrawnSet.has(i)) {
                finalAvailable.push(i)
              }
            }

            if (finalAvailable.length === 0) {
              isDrawingRef.current = false
              setIsDrawing(false)
              return prevDrawn
            }

            // Select final number from updated available pool
            const finalIndex = Math.floor(Math.random() * finalAvailable.length)
            const finalNumber = finalAvailable[finalIndex]
            setCurrentDisplay(finalNumber)
            isDrawingRef.current = false
            setIsDrawing(false)

            // Verify the number isn't already drawn (double-check safety)
            if (finalDrawnSet.has(finalNumber)) {
              console.error('Duplicate number detected! This should not happen.')
              isDrawingRef.current = false
              setIsDrawing(false)
              return prevDrawn
            }

            // Return updated state with new number
            return [...prevDrawn, finalNumber]
          })
        }
      }

      animate()
      return currentDrawn
    })
  }

  const endRaffle = () => {
    // Cancel any ongoing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    // Reset drawing state
    isDrawingRef.current = false
    setIsDrawing(false)

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

  return (
    <div className="app">
      {!isRaffleActive ? (
        <div className="setup-screen">
          <h1 className="title">LHIBC Raffles</h1>
          <div className="setup-form">
            <div className="form-group">
              <label htmlFor="raffleName">Raffle Name:</label>
              <input
                id="raffleName"
                type="text"
                value={raffleName}
                onChange={(e) => setRaffleName(e.target.value)}
                placeholder="Enter raffle name"
                className="input-large"
              />
            </div>
            <div className="form-group">
              <label htmlFor="minNumber">Min Number:</label>
              <input
                id="minNumber"
                type="number"
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
                className="input-large"
              />
            </div>
            <div className="form-group">
              <label htmlFor="maxNumber">Max Number:</label>
              <input
                id="maxNumber"
                type="number"
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
                className="input-large"
              />
            </div>
            <button onClick={startRaffle} className="btn-primary btn-large">
              Start Raffle
            </button>
            {historicalRaffles.length > 0 && (
              <div className="history-controls">
                <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary">
                  {showHistory ? 'Hide' : 'Show'} History ({historicalRaffles.length})
                </button>
                {showHistory && (
                  <button onClick={clearHistory} className="btn-danger">
                    Clear History
                  </button>
                )}
              </div>
            )}
          </div>

          {showHistory && historicalRaffles.length > 0 && (
            <div className="history-panel">
              <h2>Historical Raffles</h2>
              <div className="history-list">
                {historicalRaffles.slice().reverse().map((raffle) => (
                  <div key={raffle.id} className="history-item">
                    <div className="history-header">
                      <span className="history-name">{raffle.name}</span>
                      <span className="history-date">
                        {new Date(raffle.date).toLocaleString()}
                      </span>
                    </div>
                    <div className="history-range">
                      Range: {raffle.minNumber} - {raffle.maxNumber}
                    </div>
                    <div className="history-numbers">
                      Drawn Numbers: {raffle.drawnNumbers.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="raffle-screen">
          <div className="raffle-header">
            <h1 className="raffle-title">{raffleName}</h1>
            <div className="raffle-range">
              Range: {minNumber} - {maxNumber}
            </div>
          </div>

          <div className="draw-area">
            {currentDisplay !== null ? (
              <div className={`winning-number ${isDrawing ? 'drawing' : 'final'}`}>
                {currentDisplay}
              </div>
            ) : (
              <div className="placeholder">Ready to draw</div>
            )}
          </div>

          <div className="controls">
            <button
              onClick={drawNumber}
              disabled={isDrawing}
              className="btn-draw btn-large"
            >
              {isDrawing ? 'Drawing...' : 'Draw Number'}
            </button>
          </div>

          <div className="drawn-numbers">
            <h2>Drawn Numbers ({drawnNumbers.length})</h2>
            <div className="numbers-list">
              {drawnNumbers.length > 0 ? (
                drawnNumbers.map((num, index) => (
                  <span key={index} className="drawn-number-badge">
                    {num}
                  </span>
                ))
              ) : (
                <span className="no-numbers">No numbers drawn yet</span>
              )}
            </div>
          </div>

          <button onClick={endRaffle} className="btn-end-raffle">
            End Raffle
          </button>
        </div>
      )}
    </div>
  )
}
