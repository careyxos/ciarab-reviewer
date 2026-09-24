import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  RotateCw, 
  Flame, 
  Award, 
  ArrowRight, 
  BrainCircuit, 
  Sparkles, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Flag,
  Timer,
  Clock,
  Check,
  GraduationCap,
  BookOpen,
  Filter,
  BarChart3,
  HelpCircle,
  Eye,
  RefreshCw
} from 'lucide-react';
import { StudySet, QuizQuestion } from '../types/study';
import { 
  playCorrectSound, 
  playIncorrectSound, 
  playCelebrationSound, 
  playHapticTap, 
  playCardSwoosh,
  playBubblePop,
  playStreakSound,
  playXpSound
} from '../services/audioService';
import { fireLightCelebration, fireMiniBurst, fireComboBlast } from '../services/fxService';
import { prepareQuizPool } from '../services/quizService';

interface QuizViewProps {
  studySet: StudySet;
  onSwitchMode: (mode: 'flashcards' | 'summary' | 'dashboard' | 'quiz' | 'exam') => void;
  onCompleteQuiz: (correctCount: number, totalQuestions: number, xpGained: number) => void;
  soundEnabled: boolean;
  initialExamMode?: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({
  studySet,
  onSwitchMode,
  onCompleteQuiz,
  soundEnabled,
  initialExamMode = false,
}) => {
  // Mode selection: Practice Quiz vs. Mock Exam
  const [activeMode, setActiveMode] = useState<'practice' | 'exam'>(() => 
    initialExamMode ? 'exam' : 'practice'
  );

  // Synchronize when initialExamMode changes (e.g. from nav clicks)
  useEffect(() => {
    setActiveMode(initialExamMode ? 'exam' : 'practice');
  }, [initialExamMode]);

  // Quiz size
  const [quizSize, setQuizSize] = useState<number>(() => {
    const rawLen = studySet.quizQuestions?.length || 10;
    if (rawLen <= 5) return 5;
    if (rawLen <= 10) return 10;
    if (rawLen <= 30) return 30;
    return 50;
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>(() => 
    prepareQuizPool(studySet, 10)
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  // --- PRACTICE MODE STATE ---
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [cardShake, setCardShake] = useState(false);
  const [floatingXp, setFloatingXp] = useState<{ id: number; text: string } | null>(null);

  // --- MOCK EXAM MODE STATE ---
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(new Set());
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [examDurationSeconds, setExamDurationSeconds] = useState<number>(() => (10 * 90)); // 90s per Q
  const [examTimeRemaining, setExamTimeRemaining] = useState<number>(() => (10 * 90));
  const [isExamTimerActive, setIsExamTimerActive] = useState<boolean>(true);
  const [examTimeSpentSeconds, setExamTimeSpentSeconds] = useState<number>(0);
  const [showQuestionGrid, setShowQuestionGrid] = useState<boolean>(false);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'incorrect' | 'flagged'>('all');

  // Shared completion & answers record
  const [userAnswers, setUserAnswers] = useState<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    question: QuizQuestion;
  }[]>([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  const prevQuizSetIdRef = useRef(studySet.id);
  const prevQuizSizeRef = useRef(quizSize);

  // Reset & prepare pool when set or size changes
  useEffect(() => {
    if (prevQuizSetIdRef.current !== studySet.id || prevQuizSizeRef.current !== quizSize || questions.length === 0) {
      prevQuizSetIdRef.current = studySet.id;
      prevQuizSizeRef.current = quizSize;
      const prepared = prepareQuizPool(studySet, quizSize);
      setQuestions(prepared);
      setCurrentIndex(0);
      setSelectedOption(null);
      setTypedAnswer('');
      setIsAnswerSubmitted(false);
      setStreak(0);
      setUserAnswers([]);
      setIsQuizCompleted(false);
      setFloatingXp(null);
      setExamAnswers({});
      setFlaggedIds(new Set());
      const totalSecs = prepared.length * 90;
      setExamDurationSeconds(totalSecs);
      setExamTimeRemaining(totalSecs);
      setIsExamTimerActive(true);
      setExamTimeSpentSeconds(0);
    }
  }, [studySet.id, quizSize, questions.length]);

  const currentQ = questions[currentIndex];

  // --- EXAM COUNTDOWN TIMER ---
  useEffect(() => {
    if (activeMode !== 'exam' || isQuizCompleted || !isExamTimerActive) return;

    const timer = setInterval(() => {
      setExamTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time expires
          handleFinalizeExamSubmission();
          return 0;
        }
        return prev - 1;
      });
      setExamTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeMode, isQuizCompleted, isExamTimerActive]);

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Check identification answer match
  const checkAnswerMatch = (given: string, target: string) => {
    const cleanUser = given.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cleanUser === cleanTarget || (cleanTarget.includes(cleanUser) && cleanUser.length >= 3);
  };

  // --- PRACTICE MODE ANSWER EVALUATION ---
  const evaluateAnswer = useCallback((givenAnswer: string) => {
    if (!currentQ || isAnswerSubmitted) return;

    let correct = false;

    if (currentQ.type === 'identification') {
      correct = checkAnswerMatch(givenAnswer, currentQ.correctAnswer);
    } else {
      correct = givenAnswer === currentQ.correctAnswer;
    }

    setIsCorrect(correct);
    setIsAnswerSubmitted(true);

    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (soundEnabled) {
        playStreakSound(newStreak);
        playXpSound();
      }
      fireMiniBurst(0.5, 0.4);
      if (newStreak >= 3) {
        fireComboBlast();
      }
      const xpAmount = 25 + (newStreak >= 3 ? 15 : 0);
      setFloatingXp({
        id: Date.now(),
        text: `+${xpAmount} XP ${newStreak >= 3 ? '🔥 COMBO!' : '✨'}`
      });
    } else {
      if (soundEnabled) playIncorrectSound();
      setStreak(0);
      setCardShake(true);
      setTimeout(() => setCardShake(false), 450);
    }

    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        userAnswer: givenAnswer,
        isCorrect: correct,
        question: currentQ,
      },
    ]);
  }, [currentQ, isAnswerSubmitted, streak, soundEnabled]);

  // --- PRACTICE OPTION CLICK ---
  const handleSelectPracticeOption = useCallback((option: string) => {
    if (isAnswerSubmitted || !currentQ) return;
    if (soundEnabled) playBubblePop();
    setSelectedOption(option);
    evaluateAnswer(option);
  }, [isAnswerSubmitted, currentQ, soundEnabled, evaluateAnswer]);

  // --- PRACTICE NEXT QUESTION ---
  const handleNextPracticeQuestion = useCallback(() => {
    if (soundEnabled) playCardSwoosh();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setTypedAnswer('');
      setIsAnswerSubmitted(false);
      setFloatingXp(null);
    } else {
      // Quiz finished
      setIsQuizCompleted(true);
      const correctCount = userAnswers.filter((a) => a.isCorrect).length + (isCorrect ? 1 : 0);
      const total = questions.length;
      const xp = correctCount * 25 + (correctCount === total ? 50 : 0);

      if (soundEnabled) playCelebrationSound();
      fireComboBlast();

      onCompleteQuiz(correctCount, total, xp);
    }
  }, [currentIndex, questions.length, userAnswers, isCorrect, soundEnabled, onCompleteQuiz]);

  // --- EXAM MODE OPTION SELECT ---
  const handleSelectExamOption = (option: string) => {
    if (!currentQ) return;
    if (soundEnabled) playBubblePop();
    setExamAnswers((prev) => ({
      ...prev,
      [currentQ.id]: option
    }));
  };

  // --- EXAM MODE TOGGLE FLAG ---
  const handleToggleFlag = (qId: string) => {
    if (soundEnabled) playHapticTap();
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  // --- EXAM SUBMISSION CALCULATION ---
  const handleFinalizeExamSubmission = () => {
    setIsSubmitModalOpen(false);
    setIsExamTimerActive(false);

    // Calculate all scores
    let correctCount = 0;
    const computedUserAnswers = questions.map((q) => {
      const userChoice = examAnswers[q.id] || '';
      let isCorr = false;
      if (q.type === 'identification') {
        isCorr = checkAnswerMatch(userChoice, q.correctAnswer);
      } else {
        isCorr = userChoice === q.correctAnswer;
      }
      if (isCorr) correctCount += 1;
      return {
        questionId: q.id,
        userAnswer: userChoice,
        isCorrect: isCorr,
        question: q,
      };
    });

    setUserAnswers(computedUserAnswers);
    setIsQuizCompleted(true);

    const total = questions.length;
    const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const isPassed = scorePct >= 75;
    const xpGained = correctCount * 30 + (isPassed ? 75 : 20);

    if (soundEnabled) {
      if (isPassed) {
        playCelebrationSound();
      } else {
        playCorrectSound();
      }
    }

    if (isPassed) {
      fireComboBlast();
      fireLightCelebration(0.5, 0.5);
    }

    onCompleteQuiz(correctCount, total, xpGained);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQ || isQuizCompleted || isSubmitModalOpen) return;

      // Practice mode space/enter to continue
      if (activeMode === 'practice' && isAnswerSubmitted) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleNextPracticeQuestion();
        }
        return;
      }

      // Quick answer keys (1, 2, 3, 4 / A, B, C, D)
      if (currentQ.type !== 'identification') {
        const options = currentQ.options || ['True', 'False'];
        let chosenIdx = -1;
        if (e.code === 'Digit1' || e.code === 'Numpad1' || e.key === 'a' || e.key === 'A') chosenIdx = 0;
        else if (e.code === 'Digit2' || e.code === 'Numpad2' || e.key === 'b' || e.key === 'B') chosenIdx = 1;
        else if (e.code === 'Digit3' || e.code === 'Numpad3' || e.key === 'c' || e.key === 'C') chosenIdx = 2;
        else if (e.code === 'Digit4' || e.code === 'Numpad4' || e.key === 'd' || e.key === 'D') chosenIdx = 3;

        if (chosenIdx !== -1 && options[chosenIdx]) {
          e.preventDefault();
          if (activeMode === 'practice') {
            handleSelectPracticeOption(options[chosenIdx]);
          } else {
            handleSelectExamOption(options[chosenIdx]);
          }
        }
      }

      // Exam Mode Left/Right arrow navigation
      if (activeMode === 'exam') {
        if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
          e.preventDefault();
          setCurrentIndex((prev) => prev + 1);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          e.preventDefault();
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentQ, 
    activeMode, 
    isAnswerSubmitted, 
    isQuizCompleted, 
    isSubmitModalOpen, 
    currentIndex, 
    questions.length, 
    handleNextPracticeQuestion, 
    handleSelectPracticeOption
  ]);

  const handleReviewMistakes = () => {
    if (soundEnabled) playHapticTap();
    const wrongQs = userAnswers.filter((a) => !a.isCorrect).map((a) => a.question);
    if (wrongQs.length === 0) return;
    setQuestions(wrongQs);
    setCurrentIndex(0);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setIsQuizCompleted(false);
    setStreak(0);
    setFloatingXp(null);
    setExamAnswers({});
  };

  const handleSetQuizSize = (newSize: number) => {
    if (soundEnabled) playHapticTap();
    setQuizSize(newSize);
    const prepared = prepareQuizPool(studySet, newSize);
    setQuestions(prepared);
    setCurrentIndex(0);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setIsQuizCompleted(false);
    setStreak(0);
    setFloatingXp(null);
    setExamAnswers({});
    setFlaggedIds(new Set());
    const totalSecs = prepared.length * 90;
    setExamDurationSeconds(totalSecs);
    setExamTimeRemaining(totalSecs);
    setIsExamTimerActive(true);
    setExamTimeSpentSeconds(0);
  };

  const handleRestartQuiz = (targetSize?: number) => {
    if (soundEnabled) playHapticTap();
    const effectiveSize = targetSize || quizSize;
    if (targetSize && targetSize !== quizSize) {
      setQuizSize(targetSize);
    }
    const prepared = prepareQuizPool(studySet, effectiveSize);
    setQuestions(prepared);
    setCurrentIndex(0);
    setSelectedOption(null);
    setTypedAnswer('');
    setIsAnswerSubmitted(false);
    setUserAnswers([]);
    setIsQuizCompleted(false);
    setStreak(0);
    setFloatingXp(null);
    setExamAnswers({});
    setFlaggedIds(new Set());
    const totalSecs = prepared.length * 90;
    setExamDurationSeconds(totalSecs);
    setExamTimeRemaining(totalSecs);
    setIsExamTimerActive(true);
    setExamTimeSpentSeconds(0);
  };

  if (!currentQ && !isQuizCompleted) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-sm font-bold text-chobee-navy-700">No quiz questions found in this reviewer.</p>
        <button
          onClick={() => onSwitchMode('flashcards')}
          className="px-4 py-2 rounded-xl bg-pink-100 text-chobee-pink-600 text-xs font-bold active:scale-95"
        >
          Go to Flashcards
        </button>
      </div>
    );
  }

  // Score statistics
  const scoreCount = userAnswers.filter((a) => a.isCorrect).length;
  const scorePct = questions.length > 0 ? Math.round((scoreCount / questions.length) * 100) : 0;
  const isPassed = scorePct >= 75;
  const incorrectAnswers = userAnswers.filter((a) => !a.isCorrect);
  const weakTopics = Array.from(
    new Set(incorrectAnswers.map((a) => a.question.topicCategory || 'General'))
  );

  // Exam mode answered stats
  const answeredCount = Object.keys(examAnswers).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const flaggedCount = flaggedIds.size;

  // Filtered review list for post-exam screen
  const filteredReviewAnswers = userAnswers.filter((item) => {
    if (reviewFilter === 'incorrect') return !item.isCorrect;
    if (reviewFilter === 'flagged') return flaggedIds.has(item.questionId);
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top HUD Bar with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => onSwitchMode('flashcards')}
          className="text-xs font-semibold text-chobee-navy-700/60 hover:text-chobee-pink-600 flex items-center gap-1 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch to Flashcards</span>
        </button>

        {/* Practice vs. Mock Exam Mode Switcher Tabs */}
        {!isQuizCompleted && (
          <div className="flex items-center bg-white/90 backdrop-blur-md p-1 rounded-2xl border border-pink-200/80 shadow-2xs">
            <button
              onClick={() => {
                if (soundEnabled) playHapticTap();
                setActiveMode('practice');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeMode === 'practice'
                  ? 'bg-chobee-pink-500 text-white shadow-soft-pink'
                  : 'text-chobee-navy-700 hover:text-chobee-pink-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Practice Quiz</span>
            </button>
            <button
              onClick={() => {
                if (soundEnabled) playHapticTap();
                setActiveMode('exam');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeMode === 'exam'
                  ? 'bg-chobee-blue-600 text-white shadow-soft-blue'
                  : 'text-chobee-navy-700 hover:text-chobee-blue-600'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mock Exam</span>
            </button>
          </div>
        )}

        {/* Right HUD Badges */}
        {!isQuizCompleted && (
          <div className="flex items-center gap-2">
            {activeMode === 'practice' && streak > 0 && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black shadow-xs transition-all ${
                streak >= 3
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 animate-pulse shadow-glow-dual'
                  : 'bg-orange-50 text-orange-600 border-orange-200'
              }`}>
                <Flame className={`w-4 h-4 ${streak >= 3 ? 'fill-white animate-streak-flame' : 'fill-orange-500'}`} />
                <span>
                  {streak >= 5 ? `👑 ${streak}x Unstoppable!` : streak >= 3 ? `🔥 ${streak}x Combo!` : `${streak} Streak`}
                </span>
              </div>
            )}

            {/* Exam Mode Countdown Timer Badge */}
            {activeMode === 'exam' && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black transition-all ${
                examTimeRemaining < 180
                  ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                  : 'bg-sky-50 border-sky-200 text-chobee-blue-700 shadow-2xs'
              }`}>
                <Timer className="w-3.5 h-3.5" />
                <span className="font-mono">{formatTime(examTimeRemaining)}</span>
              </div>
            )}

            <span className="text-xs font-bold text-chobee-navy-700 bg-white/80 px-3 py-1 rounded-full border border-pink-100 shadow-2xs">
              Q {currentIndex + 1} of {questions.length}
            </span>
          </div>
        )}
      </div>

      {/* Quiz Size / Length Selector Bar (Available before starting/retaking) */}
      {!isQuizCompleted && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-pink-200/80 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-chobee-navy-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500" />
              <span>{activeMode === 'exam' ? 'Exam Length:' : 'Quiz Length:'}</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
              {activeMode === 'exam' ? '(Standard CIA Exam Simulation)' : '(Practice at your own pace)'}
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {[5, 10, 30, 50].map((count) => {
              const isSelected = quizSize === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleSetQuizSize(count)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-95 flex items-center gap-1 ${
                    isSelected
                      ? activeMode === 'exam'
                        ? 'bg-gradient-to-r from-chobee-blue-500 to-indigo-600 text-white shadow-soft-blue ring-2 ring-sky-300/70 scale-105'
                        : 'bg-gradient-to-r from-chobee-pink-500 to-rose-500 text-white shadow-soft-pink ring-2 ring-pink-300/70 scale-105'
                      : 'bg-slate-50 hover:bg-pink-50/80 text-chobee-navy-800 border border-slate-200 hover:border-pink-300'
                  }`}
                >
                  <span>{count === 50 ? '50 Max' : `${count} Qs`}</span>
                  {count === 5 && <span className="text-[10px]">⚡</span>}
                  {count === 10 && <span className="text-[10px]">🎯</span>}
                  {count === 30 && <span className="text-[10px]">📚</span>}
                  {count === 50 && <span className="text-[10px]">🔥</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* EXAM MODE: QUESTION NAVIGATOR GRID BAR */}
      {activeMode === 'exam' && !isQuizCompleted && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-sky-200/90 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-chobee-navy-800">
            <div className="flex items-center gap-2">
              <span className="font-black text-chobee-blue-700">Question Navigator:</span>
              <span className="text-[11px] text-slate-500">
                {answeredCount}/{questions.length} Answered
              </span>
              {flaggedCount > 0 && (
                <span className="text-[11px] text-amber-600 font-black flex items-center gap-0.5">
                  <Flag className="w-3 h-3 fill-amber-500 text-amber-500" /> {flaggedCount} Flagged
                </span>
              )}
            </div>

            <button
              onClick={() => handleToggleFlag(currentQ.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all active:scale-95 ${
                flaggedIds.has(currentQ.id)
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 hover:bg-amber-50 text-slate-600 border border-slate-200'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${flaggedIds.has(currentQ.id) ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>{flaggedIds.has(currentQ.id) ? 'Flagged for Review' : 'Flag Question'}</span>
            </button>
          </div>

          {/* Quick Pill Grid */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {questions.map((q, idx) => {
              const isAns = Boolean(examAnswers[q.id]);
              const isFlag = flaggedIds.has(q.id);
              const isCur = idx === currentIndex;

              let pillStyle = 'bg-slate-100 text-slate-600 border-slate-200';
              if (isAns) {
                pillStyle = 'bg-chobee-blue-500 text-white border-chobee-blue-600 shadow-2xs';
              }
              if (isCur) {
                pillStyle += ' ring-2 ring-chobee-pink-500 scale-110 font-black';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    if (soundEnabled) playHapticTap();
                    setCurrentIndex(idx);
                  }}
                  className={`relative min-w-[32px] h-8 rounded-xl text-xs font-extrabold border transition-all active:scale-95 flex items-center justify-center shrink-0 ${pillStyle}`}
                >
                  <span>{idx + 1}</span>
                  {isFlag && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-white" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QUESTION INTERFACE (ACTIVE ROUND) */}
      {!isQuizCompleted ? (
        <div className="relative">
          {/* Floating XP Reward Indicator (Gizmo Style) */}
          {floatingXp && activeMode === 'practice' && (
            <div key={floatingXp.id} className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-xp">
              <div className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-black text-sm sm:text-base shadow-2xl flex items-center gap-2 border-2 border-white/90 backdrop-blur-md">
                <span>{floatingXp.text}</span>
              </div>
            </div>
          )}

          {/* Question Card with Authentic Stationery & Washi Tape */}
          <div 
            key={`${activeMode}-${currentIndex}`}
            className={`stationery-card relative rounded-[32px] p-3.5 sm:p-6 border-2 shadow-card overflow-hidden transition-all duration-300 gpu-accelerated ${
              activeMode === 'exam' ? 'border-sky-300/80' : 'border-pink-300/80'
            } ${cardShake ? 'animate-gizmo-shake border-rose-400' : ''}`}
          >
            {/* Authentic Top Washi Tape Masking Stickers */}
            <div className="washi-tape-left" />
            <div className="washi-tape-right" />

            {/* Inner Reading Plate */}
            <div className="relative z-10 bg-white/94 backdrop-blur-md rounded-[24px] p-5 sm:p-8 border border-white/90 shadow-sm space-y-5">
              {/* Top Question Header & Progress */}
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border shadow-2xs ${
                  activeMode === 'exam'
                    ? 'text-chobee-blue-700 bg-sky-50/95 border-sky-200'
                    : 'text-chobee-pink-700 bg-pink-50/95 border-pink-200'
                }`}>
                  {currentQ.topicCategory || studySet.category}
                </span>

                <div className="flex items-center gap-2">
                  {flaggedIds.has(currentQ.id) && (
                    <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flag className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>Review Later</span>
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                    {currentQ.type === 'true_false'
                      ? 'True or False'
                      : currentQ.type === 'identification'
                      ? 'Identification'
                      : 'Multiple Choice'}
                  </span>
                </div>
              </div>

              {/* Progress Bar with Shimmer */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    activeMode === 'exam'
                      ? 'bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600'
                      : 'bg-gradient-to-r from-chobee-pink-500 via-purple-500 to-chobee-blue-500'
                  }`}
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Title */}
              <h2 className="text-lg sm:text-2xl font-black text-chobee-navy-950 font-display leading-snug pt-1">
                {currentQ.question}
              </h2>

              {/* Options / Answer Input */}
              <div className="space-y-2.5 pt-1">
                {currentQ.type === 'identification' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      disabled={activeMode === 'practice' && isAnswerSubmitted}
                      value={activeMode === 'exam' ? (examAnswers[currentQ.id] || '') : typedAnswer}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (activeMode === 'exam') {
                          setExamAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
                        } else {
                          setTypedAnswer(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (activeMode === 'practice' && !isAnswerSubmitted && typedAnswer.trim()) {
                            evaluateAnswer(typedAnswer);
                          } else if (activeMode === 'exam' && currentIndex < questions.length - 1) {
                            setCurrentIndex((prev) => prev + 1);
                          }
                        }
                      }}
                      placeholder="Type your answer here..."
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 focus:border-chobee-blue-400 bg-white text-sm sm:text-base font-bold text-chobee-navy-900 placeholder:text-slate-400 focus:outline-none shadow-xs transition-all"
                    />

                    {activeMode === 'practice' && !isAnswerSubmitted && (
                      <button
                        onClick={() => evaluateAnswer(typedAnswer)}
                        disabled={!typedAnswer.trim()}
                        className="w-full py-3.5 rounded-2xl font-black text-sm sm:text-base bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                      >
                        Submit Answer
                      </button>
                    )}
                  </div>
                ) : (
                  (currentQ.options || ['True', 'False']).map((option, idx) => {
                    const keyLabel = ['1', '2', '3', '4'][idx] || String.fromCharCode(65 + idx);

                    if (activeMode === 'exam') {
                      // EXAM MODE STYLING: No instant correct/incorrect reveal
                      const isChosen = examAnswers[currentQ.id] === option;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectExamOption(option)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 text-sm sm:text-base font-bold transition-all duration-150 flex items-center justify-between active:scale-[0.99] group relative ${
                            isChosen
                              ? 'bg-sky-50 border-chobee-blue-500 text-chobee-blue-900 shadow-md ring-2 ring-sky-200/80 scale-[1.01]'
                              : 'bg-white/95 border-slate-200/90 hover:border-sky-300 hover:bg-sky-50/40 text-chobee-navy-950 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              isChosen
                                ? 'bg-chobee-blue-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-chobee-blue-600'
                            }`}>
                              {keyLabel}
                            </span>
                            <span className="leading-snug">{option}</span>
                          </div>

                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isChosen ? 'border-chobee-blue-600 bg-chobee-blue-600' : 'border-slate-300'
                          }`}>
                            {isChosen && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </button>
                      );
                    }

                    // PRACTICE MODE STYLING: Immediate Feedback
                    const isSelected = selectedOption === option;
                    const isTarget = option === currentQ.correctAnswer;

                    let optionStyle =
                      'bg-white/95 border-slate-200/90 hover:border-pink-300 hover:bg-pink-50/50 text-chobee-navy-950 shadow-xs hover:shadow-md';

                    if (!isAnswerSubmitted) {
                      if (isSelected) {
                        optionStyle = 'bg-pink-100/90 border-pink-400 text-pink-700 shadow-md ring-2 ring-pink-300 scale-[1.01]';
                      }
                    } else {
                      if (isTarget) {
                        optionStyle = 'bg-emerald-500 text-white font-black border-emerald-400 shadow-lg ring-4 ring-emerald-200 animate-gizmo-bounce';
                      } else if (isSelected && !isCorrect) {
                        optionStyle = 'bg-rose-50 border-rose-400 text-rose-800 line-through ring-2 ring-rose-200 opacity-90';
                      } else {
                        optionStyle = 'bg-white/60 border-slate-200/60 text-slate-400 opacity-40';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswerSubmitted}
                        onClick={() => handleSelectPracticeOption(option)}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 text-sm sm:text-base font-bold transition-all duration-200 flex items-center justify-between active:scale-[0.98] group relative ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                            isAnswerSubmitted && isTarget 
                              ? 'bg-white text-emerald-600 shadow-xs' 
                              : isAnswerSubmitted && isSelected && !isCorrect
                              ? 'bg-rose-200 text-rose-800'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-pink-100 group-hover:text-pink-600'
                          }`}>
                            {keyLabel}
                          </span>
                          <span className="leading-snug">{option}</span>
                        </div>

                        {isAnswerSubmitted && isTarget && (
                          <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2 animate-bounce" />
                        )}
                        {isAnswerSubmitted && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* PRACTICE MODE: Explanation Box on Submit */}
              {activeMode === 'practice' && isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-2xl border-2 text-xs sm:text-sm animate-pop-card-in space-y-1.5 shadow-xs ${
                    isCorrect
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : 'bg-rose-50/90 border-rose-300 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Excellent work! Correct answer! 🌸</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Almost had it! Correct Answer: {currentQ.correctAnswer} 💡</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed opacity-95 pl-6">{currentQ.explanation}</p>
                </div>
              )}

              {/* PRACTICE MODE: Bottom Continue Button */}
              {activeMode === 'practice' && isAnswerSubmitted && (
                <div className="pt-2 animate-pop-card-in">
                  <button
                    onClick={handleNextPracticeQuestion}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                      isCorrect
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-200/60'
                        : 'bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white shadow-slate-300'
                    }`}
                  >
                    <span>{currentIndex < questions.length - 1 ? 'Continue' : 'Finish Quiz & View Score'}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-xs opacity-80 font-normal bg-white/20 px-2 py-0.5 rounded-full ml-1 hidden sm:inline">
                      Space or Enter
                    </span>
                  </button>
                </div>
              )}

              {/* EXAM MODE: NAVIGATION CONTROLS & SUBMIT BUTTON */}
              {activeMode === 'exam' && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={() => {
                      if (soundEnabled) playHapticTap();
                      setCurrentIndex((prev) => Math.max(0, prev - 1));
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-chobee-navy-800 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {currentIndex < questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (soundEnabled) playHapticTap();
                          setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
                        }}
                        className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white text-xs font-black shadow-md transition-all active:scale-95"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : null}

                    {/* Submit Exam Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (soundEnabled) playHapticTap();
                        setIsSubmitModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-chobee-blue-600 to-indigo-600 hover:from-chobee-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-soft-blue transition-all active:scale-95"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Submit Exam</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* QUIZ / EXAM RESULTS SUMMARY & CELEBRATION */
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-pink-200/80 shadow-card space-y-6 animate-pop-card-in">
          <div className="text-center space-y-2">
            <span className="text-5xl animate-bounce inline-block">
              {isPassed ? '🎓' : '📚'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-chobee-navy-950 font-display">
              {activeMode === 'exam' 
                ? (isPassed ? 'Exam Passed! Outstanding Performance! 🎉' : 'Mock Exam Completed! 📖') 
                : 'Quiz Completed! 🎉'}
            </h2>
            <p className="text-xs sm:text-sm text-chobee-navy-700/80 max-w-md mx-auto">
              {scorePct >= 90
                ? '🌟 Master level! Exceptional accuracy and deep understanding of the concepts.'
                : scorePct >= 75
                ? '🌸 Passing mark achieved! Great progress and solid foundation for your CIA exams.'
                : '🧸 Good practice run! Review the explanations below and try another round to hit the 75% passing mark.'}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card-pink rounded-2xl p-4 text-center border border-pink-200 shadow-xs">
              <span className="text-[11px] font-black text-chobee-pink-600 uppercase">Score</span>
              <div className="text-2xl sm:text-3xl font-black text-chobee-navy-950 font-display mt-1">
                {scoreCount} / {questions.length}
              </div>
            </div>

            <div className="glass-card-blue rounded-2xl p-4 text-center border border-sky-200 shadow-xs">
              <span className="text-[11px] font-black text-chobee-blue-600 uppercase">Accuracy</span>
              <div className="text-2xl sm:text-3xl font-black text-chobee-navy-950 font-display mt-1">
                {scorePct}%
              </div>
            </div>

            <div className={`glass-panel rounded-2xl p-4 text-center border shadow-xs ${
              isPassed ? 'bg-emerald-50/80 border-emerald-200' : 'bg-amber-50/80 border-amber-200'
            }`}>
              <span className={`text-[11px] font-black uppercase ${isPassed ? 'text-emerald-700' : 'text-amber-700'}`}>
                Result
              </span>
              <div className={`text-xl sm:text-2xl font-black font-display mt-1.5 ${isPassed ? 'text-emerald-700' : 'text-amber-800'}`}>
                {isPassed ? 'PASSED 🎓' : 'REVIEW 📖'}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-4 text-center bg-purple-50/80 border border-purple-200 shadow-xs">
              <span className="text-[11px] font-black text-purple-600 uppercase">XP Gained</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-700 font-display mt-1">
                +{scoreCount * 25 + (isPassed ? 50 : 0)} ⭐
              </div>
            </div>
          </div>

          {/* Weak Topics Recommendation */}
          {weakTopics.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Recommended Focus Topics for Review:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white text-amber-900 border border-amber-200 shadow-xs"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ITEM-BY-ITEM QUESTION REVIEW SECTION */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-chobee-navy-800" />
                <span className="text-xs font-black text-chobee-navy-900">Question Performance Review:</span>
              </div>

              {/* Review Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    reviewFilter === 'all' ? 'bg-white text-chobee-navy-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  All ({userAnswers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('incorrect')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    reviewFilter === 'incorrect' ? 'bg-rose-500 text-white shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Mistakes ({incorrectAnswers.length})
                </button>
                {flaggedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewFilter('flagged')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      reviewFilter === 'flagged' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Flagged ({flaggedCount})
                  </button>
                )}
              </div>
            </div>

            {/* Questions Detailed List */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {filteredReviewAnswers.map((item, idx) => {
                const isFlagged = flaggedIds.has(item.questionId);
                return (
                  <div
                    key={item.questionId}
                    className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                      item.isCorrect
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-rose-50/50 border-rose-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                          item.isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {item.isCorrect ? '✓' : '✗'}
                        </span>
                        <span className="font-black text-chobee-navy-950 font-display">
                          {item.question.question}
                        </span>
                      </div>

                      {isFlagged && (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black flex items-center gap-1">
                          <Flag className="w-2.5 h-2.5 fill-amber-500" /> Flagged
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className={`p-2.5 rounded-xl border font-semibold ${
                        item.isCorrect
                          ? 'bg-white/90 border-emerald-200 text-emerald-950'
                          : 'bg-white/90 border-rose-200 text-rose-950'
                      }`}>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Your Answer:</span>
                        <span>{item.userAnswer || '(Unanswered)'}</span>
                      </div>

                      <div className="p-2.5 rounded-xl border bg-white/90 border-slate-200 text-chobee-navy-950 font-semibold">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Correct Answer:</span>
                        <span className="text-emerald-700 font-bold">{item.question.correctAnswer}</span>
                      </div>
                    </div>

                    {item.question.explanation && (
                      <p className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                        <span className="font-bold text-chobee-navy-900">Explanation: </span>
                        {item.question.explanation}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Retake & Navigation Actions */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500">Practice another round:</span>
              <span className="text-xs font-black text-chobee-pink-600">Choose Exam Length 🎓</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[5, 10, 30, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => handleRestartQuiz(num)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    quizSize === num
                      ? 'bg-chobee-navy-900 text-white border-chobee-navy-900 shadow-xs'
                      : 'bg-white hover:bg-pink-50 text-chobee-navy-800 border-slate-200'
                  }`}
                >
                  <RotateCw className="w-3 h-3 text-chobee-pink-500" />
                  <span>{num === 50 ? 'Retake 50 Max' : `Retake ${num} Qs`}</span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {incorrectAnswers.length > 0 && (
                <button
                  onClick={handleReviewMistakes}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 shadow-xs active:scale-95"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Practice Mistakes ({incorrectAnswers.length})</span>
                </button>
              )}

              <button
                onClick={() => onSwitchMode('flashcards')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 text-white text-xs font-bold shadow-soft-pink active:scale-95 ml-auto"
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Back to Flashcards</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXAM SUBMIT CONFIRMATION MODAL */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-sky-200 shadow-glow-dual space-y-5 animate-scaleIn">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center mx-auto text-2xl">
                🎓
              </div>
              <h3 className="text-xl font-black text-chobee-navy-950 font-display">
                Ready to submit your Exam?
              </h3>
              <p className="text-xs text-slate-500 font-semibold">
                Please review your progress before finalizing. Once submitted, your score will be calculated.
              </p>
            </div>

            {/* Quick Status Stats */}
            <div className="grid grid-cols-3 gap-2 py-1">
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-center">
                <span className="text-[10px] font-bold text-chobee-blue-600 uppercase block">Answered</span>
                <span className="text-lg font-black text-chobee-navy-900">{answeredCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Flagged</span>
                <span className="text-lg font-black text-amber-800">{flaggedCount}</span>
              </div>
              <div className={`p-3 rounded-2xl border text-center ${
                unansweredCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <span className={`text-[10px] font-bold uppercase block ${
                  unansweredCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  Unanswered
                </span>
                <span className={`text-lg font-black ${
                  unansweredCount > 0 ? 'text-rose-700' : 'text-emerald-800'
                }`}>
                  {unansweredCount}
                </span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>You still have {unansweredCount} unanswered questions!</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95"
              >
                Return to Exam
              </button>
              <button
                type="button"
                onClick={handleFinalizeExamSubmission}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-chobee-blue-600 to-indigo-600 hover:from-chobee-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-soft-blue transition-all active:scale-95"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
