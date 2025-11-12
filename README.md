# Raffle Number Drawer

A React application for running club raffles with a TV-friendly interface.

## Features

- **Raffle Setup**: Enter a raffle name and set min/max number range
- **Animated Drawing**: Draw numbers with a 3-6 second scrolling animation
- **History Tracking**: View all drawn numbers at the bottom of the screen
- **Historical Raffles**: Save and review past raffles in local storage
- **TV Optimized**: Large fonts and UI elements perfect for casting to TV
- **End Raffle**: Reset and save current raffle to history

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

### Build for Production

```bash
npm run build
```

## Usage

1. **Setup**: Enter a raffle name and set your number range (min and max)
2. **Start Raffle**: Click "Start Raffle" to begin
3. **Draw Numbers**: Click "Draw Number" to randomly select a number (with animation)
4. **View History**: Drawn numbers appear at the bottom of the screen
5. **End Raffle**: Click "End Raffle" (bottom right) to save and reset
6. **Review Past Raffles**: Use "Show History" on the setup screen to view all past raffles

## Features Details

- **Number Drawing**: Each draw animates for 3-6 seconds before revealing the winning number
- **No Duplicates**: Numbers cannot be drawn twice in the same raffle
- **Local Storage**: All historical raffles are saved in your browser's local storage
- **TV Friendly**: Large fonts and high contrast design optimized for TV displays
- **iPad Safari Optimized**: Specifically optimized for Safari on iPad with screen mirroring support
  - Touch-friendly controls (minimum 44px touch targets)
  - Smooth scrolling and animations
  - Prevents zoom on input focus
  - Optimized for landscape orientation
  - WebKit-specific optimizations for best performance

## Technology

- React 19
- Vite
- CSS3 with animations
