import { Achievement } from '../types/study';

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-set',
    icon: '🌱',
    title: 'First Study Set',
    description: 'Created or opened your very first study set on the platform.',
    category: 'study',
    unlocked: true,
    unlockedAt: '2026-09-08',
    progress: 1,
    maxProgress: 1
  },
  {
    id: 'ach-100-cards',
    icon: '📚',
    title: '100 Flashcards Mastered',
    description: 'Successfully rated 100 flashcards as Easy or Mastered.',
    category: 'study',
    unlocked: false,
    progress: 42,
    maxProgress: 100
  },
  {
    id: 'ach-7-streak',
    icon: '🔥',
    title: '7-Day Study Streak',
    description: 'Maintained an unbroken study streak for seven consecutive days.',
    category: 'streak',
    unlocked: true,
    unlockedAt: '2026-09-11',
    progress: 7,
    maxProgress: 7
  },
  {
    id: 'ach-mayor-honor',
    icon: '👑',
    title: "Mayor's Honor Roll",
    description: 'Achieved a 90% or higher score on three different quizzes.',
    category: 'quiz',
    unlocked: true,
    unlockedAt: '2026-09-10',
    progress: 3,
    maxProgress: 3
  },
  {
    id: 'ach-chobee-proud',
    icon: '🧸',
    title: "Chobee's Proudest Student",
    description: 'Unlocked the secret Monthsary space and took a well-deserved breather.',
    category: 'special',
    unlocked: false,
    progress: 0,
    maxProgress: 1
  },
  {
    id: 'ach-tourism-survivor',
    icon: '🌸',
    title: 'Tourism Week Survivor',
    description: 'Mastered the Tourism Week Program Script & Flow reviewer.',
    category: 'special',
    unlocked: true,
    unlockedAt: '2026-09-09',
    progress: 5,
    maxProgress: 5
  },
  {
    id: 'ach-late-night',
    icon: '☕',
    title: 'Late Night Study Champion',
    description: 'Completed a flashcard study session past 10:00 PM.',
    category: 'study',
    unlocked: true,
    unlockedAt: '2026-09-10',
    progress: 1,
    maxProgress: 1
  }
];
