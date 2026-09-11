import confetti from 'canvas-confetti';

let lastBurstTime = 0;

/**
 * High-performance, rate-limited celebration effect that never lags or accumulates.
 */
export function fireLightCelebration(x = 0.5, y = 0.6) {
  const now = Date.now();
  // Throttle: don't fire more than once every 1200ms
  if (now - lastBurstTime < 1200) return;
  lastBurstTime = now;

  try {
    confetti({
      particleCount: 20,
      spread: 50,
      startVelocity: 25,
      ticks: 120, // disappear quickly (approx 1.5 seconds)
      decay: 0.92,
      origin: { x, y },
      colors: ['#F472B6', '#38BDF8', '#C084FC'],
      disableForReducedMotion: true,
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Snappy Gizmo-style micro sparkle burst on correct answer.
 */
export function fireMiniBurst(x = 0.5, y = 0.5) {
  try {
    confetti({
      particleCount: 16,
      spread: 45,
      startVelocity: 18,
      ticks: 70,
      decay: 0.90,
      origin: { x, y },
      colors: ['#F472B6', '#EC4899', '#38BDF8', '#FBBF24', '#34D399'],
      disableForReducedMotion: true,
      shapes: ['circle', 'square'],
      scalar: 0.8,
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Double cannon celebratory burst on combo streaks or deck completion.
 */
export function fireComboBlast() {
  try {
    confetti({
      particleCount: 30,
      angle: 60,
      spread: 55,
      origin: { x: 0.1, y: 0.7 },
      colors: ['#F472B6', '#38BDF8', '#FBBF24', '#A855F7'],
    });
    confetti({
      particleCount: 30,
      angle: 120,
      spread: 55,
      origin: { x: 0.9, y: 0.7 },
      colors: ['#F472B6', '#38BDF8', '#FBBF24', '#A855F7'],
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Clear any active confetti canvases immediately from the DOM.
 */
export function clearCelebration() {
  try {
    confetti.reset();
  } catch (e) {
    // ignore
  }
}
