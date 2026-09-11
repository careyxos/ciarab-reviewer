import { StudySet, UserStats, Achievement, Flashcard } from '../types/study';
import { INITIAL_STUDY_SETS } from '../data/initialSets';
import { INITIAL_ACHIEVEMENTS } from '../data/achievements';

const STORAGE_KEYS = {
  SETS: 'chobee_study_sets_v1',
  STATS: 'chobee_user_stats_v1',
  ACHIEVEMENTS: 'chobee_achievements_v1',
  API_KEY: 'chobee_gemini_key_v1',
  WATER_DATE: 'chobee_water_date_v1',
};

export const DEFAULT_STATS: UserStats = {
  totalMastered: 8,
  quizzesCompleted: 6,
  correctAnswersTotal: 22,
  totalQuestionsAnswered: 25,
  studyStreak: 7,
  totalStudyMinutes: 240,
  xp: 1280,
  level: 5,
  rankTitle: 'Mayor Honor Scholar 👑',
  waterGlassesToday: 5,
  lastActiveDate: new Date().toISOString(),
};

export const HIGH_YIELD_FALLBACK_CARDS = [
  {
    front: 'What is the significance or definition of "Operational Standards"?',
    back: 'The standardized operating procedures executed to guarantee efficiency, accuracy, and institutional compliance during academic events and reviews.',
    hint: 'Key focus: Operational Standards...',
  },
  {
    front: 'What is the significance or definition of "Resource Management"?',
    back: 'The strategic allocation of logistical assets, committee budgets, and manpower to achieve institutional milestones efficiently.',
    hint: 'Key focus: Resource Management...',
  },
  {
    front: 'What is the significance or definition of "Protocol and Precedence"?',
    back: 'The formal order, etiquette, and procedural guidelines strictly maintained in academic assemblies, official meetings, and presentations.',
    hint: 'Key focus: Protocol & Precedence...',
  },
  {
    front: 'What is the significance or definition of "Contingency Planning"?',
    back: 'Pre-planned response mechanisms designed to mitigate disruptions, logistical delays, and technical malfunctions in scheduled programs.',
    hint: 'Key focus: Contingency Planning...',
  },
  {
    front: 'What is the significance or definition of "Stakeholder Coordination"?',
    back: 'Active synchronization and clear communication maintained between class officers, working committees, department faculty, and participants.',
    hint: 'Key focus: Stakeholder Coordination...',
  },
  {
    front: 'What is the significance or definition of "Quality Assurance"?',
    back: 'Systematic verification procedures conducted before live execution or examination assessments to ensure top performance.',
    hint: 'Key focus: Quality Assurance...',
  },
];

export function isCorruptedCard(card: Flashcard): boolean {
  if (!card) return false;
  const frontLower = (card.front || '').toLowerCase();
  const backLower = (card.back || '').toLowerCase();

  return (
    backLower.includes('flatedecode') ||
    backLower.includes('endstream') ||
    backLower.includes('endobj') ||
    backLower.includes('stream eq') ||
    (backLower.includes('filter') && backLower.includes('length')) ||
    (backLower.includes('filter') && backLower.includes('stream')) ||
    frontLower.includes('flatedecode') ||
    frontLower.includes('stream eq') ||
    (frontLower.includes('"pdf"') && !backLower.includes('portable document format')) ||
    frontLower === 'what is the significance or definition of "pdf"?' ||
    (backLower.length > 30 && backLower.replace(/[^A-Za-z]/g, '').length / backLower.length < 0.5)
  );
}

export function sanitizeCard(card: Flashcard, index: number = 0): Flashcard {
  if (!isCorruptedCard(card)) return card;

  const fallback = HIGH_YIELD_FALLBACK_CARDS[index % HIGH_YIELD_FALLBACK_CARDS.length];
  return {
    ...card,
    front: fallback.front,
    back: fallback.back,
    hint: fallback.hint,
    aiExplanation: `Mayor Cia, ganito lang kasimple yan: Ang konseptong ito ay gabay para seamless at mataas ang grado mo sa exam at committee work! Super proud si Baby Bear sa sipag mo mag-aral. 🧸🩵`,
  };
}

export function getStoredStudySets(): StudySet[] {
  if (typeof window === 'undefined') return INITIAL_STUDY_SETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(INITIAL_STUDY_SETS));
      return INITIAL_STUDY_SETS;
    }
    const parsed = JSON.parse(raw);
    const sets: StudySet[] = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STUDY_SETS;

    // Sanitize any cards that may contain FlateDecode or binary artifacts
    let wasModified = false;
    const cleanedSets = sets.map((set) => {
      let setChanged = false;
      const cleanCards = (set.flashcards || []).map((card, idx) => {
        if (isCorruptedCard(card)) {
          setChanged = true;
          wasModified = true;
          return sanitizeCard(card, idx);
        }
        return card;
      });

      const cleanQuizzes = (set.quizQuestions || []).map((q) => {
        const qText = (q.question || '').toLowerCase();
        const aText = (q.correctAnswer || '').toLowerCase();
        if (
          qText.includes('flatedecode') || 
          aText.includes('flatedecode') || 
          qText.includes('stream eq') || 
          aText.includes('stream eq') ||
          qText.includes('"pdf"')
        ) {
          setChanged = true;
          wasModified = true;
          return {
            ...q,
            question: 'What is the primary objective of establishing Standard Operating Procedures?',
            options: [
              'To guarantee operational consistency, safety, and institutional compliance',
              'To eliminate the need for event documentation and reporting',
              'To bypass administrative review protocols',
              'To increase logistical expenditures'
            ],
            correctAnswer: 'To guarantee operational consistency, safety, and institutional compliance',
            explanation: 'SOPs establish clear, repeatable standards that prevent bottlenecks and ensure organizational safety.'
          };
        }
        return q;
      });

      if (setChanged) {
        return {
          ...set,
          flashcards: cleanCards,
          quizQuestions: cleanQuizzes,
        };
      }
      return set;
    });

    if (wasModified) {
      localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(cleanedSets));
    }

    return cleanedSets;
  } catch (err) {
    console.error('Failed to load study sets from storage:', err);
    return INITIAL_STUDY_SETS;
  }
}

export function saveStoredStudySets(sets: StudySet[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETS, JSON.stringify(sets));
  } catch (err) {
    console.error('Failed to save study sets to storage:', err);
  }
}

export function getStoredStats(): UserStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(DEFAULT_STATS));
      return DEFAULT_STATS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return DEFAULT_STATS;
  }
}

export function saveStoredStats(stats: UserStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save stats to storage:', err);
  }
}

export function getStoredAchievements(): Achievement[] {
  if (typeof window === 'undefined') return INITIAL_ACHIEVEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(INITIAL_ACHIEVEMENTS));
      return INITIAL_ACHIEVEMENTS;
    }
    return JSON.parse(raw);
  } catch (err) {
    return INITIAL_ACHIEVEMENTS;
  }
}

export function saveStoredAchievements(achievements: Achievement[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  } catch (err) {
    console.error('Failed to save achievements to storage:', err);
  }
}

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

export function saveStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
}

/**
 * Generates a self-contained shareable URL that embeds the study set data
 * allowing classmates to review immediately without login!
 */
export function generateShareableLink(set: StudySet): string {
  try {
    const payload = {
      t: set.title,
      d: set.description,
      c: set.category,
      f: set.flashcards.map((fc) => ({ f: fc.front, b: fc.back, h: fc.hint, e: fc.aiExplanation })),
      q: set.quizQuestions.map((q) => ({ t: q.type, q: q.question, o: q.options, a: q.correctAnswer, e: q.explanation })),
    };
    const json = JSON.stringify(payload);
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(json))));
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('share', encoded);
    return url.toString();
  } catch (err) {
    console.error('Failed to generate share link:', err);
    return window.location.href;
  }
}

/**
 * Checks if the current URL contains a shared study set and parses it.
 */
export function parseSharedSetFromUrl(): StudySet | null {
  if (typeof window === 'undefined') return null;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    if (!shareParam) return null;

    const json = decodeURIComponent(escape(atob(decodeURIComponent(shareParam))));
    const p = JSON.parse(json);

    return {
      id: `shared-${Date.now()}`,
      title: p.t || 'Shared Study Set',
      description: p.d || 'Shared with you by Mayor Cia',
      category: p.c || 'General',
      tags: ['Shared', 'Classmate Reviewer'],
      themeColor: 'pink',
      author: 'Shared by Mayor Cia',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      flashcards: (p.f || []).map((f: { f: string; b: string; h?: string; e?: string }, idx: number): Flashcard => ({
        id: `shared-fc-${idx}`,
        front: f.f,
        back: f.b,
        hint: f.h,
        category: p.c,
        tags: ['Shared'],
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date().toISOString(),
        state: 'new',
        aiExplanation: f.e,
      })),
      quizQuestions: (p.q || []).map((q: any, idx: number) => ({
        id: `shared-q-${idx}`,
        type: q.t || 'multiple_choice',
        question: q.q,
        options: q.o,
        correctAnswer: q.a,
        explanation: q.e || '',
        topicCategory: p.c,
      })),
      summary: {
        overview: `Shared reviewer for "${p.t}".`,
        keyConcepts: [],
        glossary: [],
        examQuestions: [],
      },
    };
  } catch (err) {
    console.error('Failed to parse shared set from URL:', err);
    return null;
  }
}
