import { Flashcard, CardRating } from '../types/study';

/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm Implementation
 * 
 * Ratings:
 * - 'again' (grade 1): Complete blackout / incorrect. Interval resets to 1 day.
 * - 'hard'  (grade 3): Correct with substantial effort. Interval slightly increased.
 * - 'good'  (grade 4): Correct with normal effort. Standard SM-2 interval progression.
 * - 'easy'  (grade 5): Perfect recall. Interval multiplied with bonus.
 */
export function calculateNextReview(card: Flashcard, rating: CardRating): Flashcard {
  let grade: number;
  switch (rating) {
    case 'again':
      grade = 1;
      break;
    case 'hard':
      grade = 3;
      break;
    case 'good':
      grade = 4;
      break;
    case 'easy':
      grade = 5;
      break;
  }

  let { easeFactor = 2.5, interval = 0, repetitions = 0 } = card;

  // Calculate new Ease Factor: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  let newEaseFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newInterval: number;
  let newRepetitions: number;
  let newState: Flashcard['state'] = card.state;

  if (grade < 3) {
    // Failed recall
    newRepetitions = 0;
    newInterval = 1;
    newState = 'learning';
  } else {
    // Successful recall
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
      if (rating === 'easy') {
        newInterval = Math.round(newInterval * 1.3);
      }
    }
    newRepetitions = repetitions + 1;

    if (newRepetitions >= 4 || newInterval >= 21) {
      newState = 'mastered';
    } else {
      newState = 'review';
    }
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + newInterval);

  return {
    ...card,
    easeFactor: Number(newEaseFactor.toFixed(2)),
    interval: newInterval,
    repetitions: newRepetitions,
    nextReviewDate: nextDate.toISOString(),
    lastReviewedDate: new Date().toISOString(),
    state: newState
  };
}

/**
 * Checks if a flashcard is currently due for review
 */
export function isCardDue(card: Flashcard): boolean {
  if (!card.nextReviewDate) return true;
  const reviewTime = new Date(card.nextReviewDate).getTime();
  const now = Date.now();
  return reviewTime <= now;
}
