import React, { useState, useEffect, useCallback } from 'react';
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
  Zap
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
  onSwitchMode: (mode: 'flashcards' | 'summary' | 'dashboard') => void;
  onCompleteQuiz: (correctCount: number, totalQuestions: number, xpGained: number) => void;
  soundEnabled: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({
  studySet,
  onSwitchMode,
  onCompleteQuiz,
  soundEnabled,
}) => {
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [streak, setStreak] = useState(0);
  const [cardShake, setCardShake] = useState(false);
  const [floatingXp, setFloatingXp] = useState<{ id: number; text: string } | null>(null);
  const [userAnswers, setUserAnswers] = useState<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    question: QuizQuestion;
  }[]>([]);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  useEffect(() => {
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
  }, [studySet, quizSize]);

  const currentQ = questions[currentIndex];

  const evaluateAnswer = useCallback((givenAnswer: string) => {
    if (!currentQ || isAnswerSubmitted) return;

    let correct = false;

    if (currentQ.type === 'identification') {
      const cleanUser = givenAnswer.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanTarget = currentQ.correctAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
      correct = cleanUser === cleanTarget || (cleanTarget.includes(cleanUser) && cleanUser.length >= 3);
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

  const handleSelectOption = useCallback((option: string) => {
    if (isAnswerSubmitted || !currentQ) return;
    if (soundEnabled) playBubblePop();
    setSelectedOption(option);
    evaluateAnswer(option);
  }, [isAnswerSubmitted, currentQ, soundEnabled, evaluateAnswer]);

  const handleNextQuestion = useCallback(() => {
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

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      if (soundEnabled) playCardSwoosh();
      setCurrentIndex((prev) => prev - 1);
      setSelectedOption(null);
      setTypedAnswer('');
      setIsAnswerSubmitted(false);
      setFloatingXp(null);
    }
  };

  // Keyboard navigation shortcuts for Gizmo-style gameplay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentQ) return;

      if (isAnswerSubmitted) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleNextQuestion();
        }
        return;
      }

      if (currentQ.type !== 'identification') {
        const options = currentQ.options || ['True', 'False'];
        if ((e.code === 'Digit1' || e.code === 'Numpad1' || e.key === 'a' || e.key === 'A') && options[0]) {
          e.preventDefault();
          handleSelectOption(options[0]);
        } else if ((e.code === 'Digit2' || e.code === 'Numpad2' || e.key === 'b' || e.key === 'B') && options[1]) {
          e.preventDefault();
          handleSelectOption(options[1]);
        } else if ((e.code === 'Digit3' || e.code === 'Numpad3' || e.key === 'c' || e.key === 'C') && options[2]) {
          e.preventDefault();
          handleSelectOption(options[2]);
        } else if ((e.code === 'Digit4' || e.code === 'Numpad4' || e.key === 'd' || e.key === 'D') && options[3]) {
          e.preventDefault();
          handleSelectOption(options[3]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentQ, isAnswerSubmitted, handleNextQuestion, handleSelectOption]);

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

  const scoreCount = userAnswers.filter((a) => a.isCorrect).length;
  const scorePct = questions.length > 0 ? Math.round((scoreCount / questions.length) * 100) : 0;
  const incorrectAnswers = userAnswers.filter((a) => !a.isCorrect);
  const weakTopics = Array.from(
    new Set(incorrectAnswers.map((a) => a.question.topicCategory || 'General'))
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onSwitchMode('flashcards')}
          className="text-xs font-semibold text-chobee-navy-700/60 hover:text-chobee-pink-600 flex items-center gap-1 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch to Flashcards</span>
        </button>

        {!isQuizCompleted && (
          <div className="flex items-center gap-2.5">
            {streak > 0 && (
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
            <span className="text-xs font-bold text-chobee-navy-700 bg-white/80 px-3 py-1 rounded-full border border-pink-100 shadow-2xs">
              Q {currentIndex + 1} of {questions.length}
            </span>
          </div>
        )}
      </div>

      {/* Quiz Size / Length Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-pink-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-chobee-navy-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500" />
            <span>Quiz Length:</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
            (Ilang quizzes ang sasagutan mo?)
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
                    ? 'bg-gradient-to-r from-chobee-pink-500 to-rose-500 text-white shadow-soft-pink ring-2 ring-pink-300/70 scale-105'
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

      {!isQuizCompleted ? (
        <div className="relative">
          {/* Floating XP Reward Indicator (Gizmo Style) */}
          {floatingXp && (
            <div key={floatingXp.id} className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-xp">
              <div className="px-5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-black text-sm sm:text-base shadow-2xl flex items-center gap-2 border-2 border-white/90 backdrop-blur-md">
                <span>{floatingXp.text}</span>
              </div>
            </div>
          )}

          {/* Question Card with Gizmo Shake & Bouncy Feedback */}
          <div 
            key={currentIndex}
            className={`stationery-card relative rounded-[32px] p-3.5 sm:p-6 border-2 border-pink-300/80 shadow-card overflow-hidden transition-all duration-300 gpu-accelerated ${
              cardShake ? 'animate-gizmo-shake border-rose-400' : ''
            }`}
          >
            {/* Authentic Top Washi Tape Masking Stickers */}
            <div className="washi-tape-left" />
            <div className="washi-tape-right" />

            {/* Inner Reading Plate */}
            <div className="relative z-10 bg-white/94 backdrop-blur-md rounded-[24px] p-5 sm:p-8 border border-white/90 shadow-sm space-y-5">
              {/* Top Question Header & Progress */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-chobee-pink-700 bg-pink-50/95 px-3 py-1 rounded-full border border-pink-200 shadow-2xs">
                  {currentQ.topicCategory || studySet.category}
                </span>
                <span className="text-xs font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                  {currentQ.type === 'true_false'
                    ? 'True or False'
                    : currentQ.type === 'identification'
                    ? 'Identification'
                    : 'Multiple Choice'}
                </span>
              </div>

              {/* Progress Bar with Shimmer */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                <div
                  className="bg-gradient-to-r from-chobee-pink-500 via-purple-500 to-chobee-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Title */}
              <h2 className="text-lg sm:text-2xl font-black text-chobee-navy-950 font-display leading-snug pt-1">
                {currentQ.question}
              </h2>

              {/* Options / Answer Input (Gizmo Tap to Answer) */}
              <div className="space-y-2.5 pt-1">
                {currentQ.type === 'identification' ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      disabled={isAnswerSubmitted}
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isAnswerSubmitted && typedAnswer.trim()) {
                          evaluateAnswer(typedAnswer);
                        }
                      }}
                      placeholder="Type your answer here..."
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-300 focus:border-pink-400 bg-white text-sm sm:text-base font-bold text-chobee-navy-900 placeholder:text-slate-400 focus:outline-none shadow-xs transition-all"
                    />
                    {!isAnswerSubmitted ? (
                      <button
                        onClick={() => evaluateAnswer(typedAnswer)}
                        disabled={!typedAnswer.trim()}
                        className="w-full py-3.5 rounded-2xl font-black text-sm sm:text-base bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                      >
                        Submit Answer
                      </button>
                    ) : null}
                  </div>
                ) : (
                  (currentQ.options || ['True', 'False']).map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isTarget = option === currentQ.correctAnswer;
                    const keyLabel = ['1', '2', '3', '4'][idx] || String.fromCharCode(65 + idx);

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
                        onClick={() => handleSelectOption(option)}
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

              {/* Explanation Box on Submit (Warm Taglish Feedback) */}
              {isAnswerSubmitted && (
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
                        <span>Galing mo, Mayor Cia! Tama! 🌸</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Halos nakuha mo na! Tamang sagot: {currentQ.correctAnswer} 💡</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed opacity-95 pl-6">{currentQ.explanation}</p>
                </div>
              )}

              {/* Bottom Continue Button (Gizmo Style) */}
              {isAnswerSubmitted && (
                <div className="pt-2 animate-pop-card-in">
                  <button
                    onClick={handleNextQuestion}
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
            </div>
          </div>
        </div>
      ) : (
        /* QUIZ RESULTS SUMMARY (Gizmo Celebration Screen) */
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-pink-200/80 shadow-card space-y-6 animate-pop-card-in">
          <div className="text-center space-y-2">
            <span className="text-5xl animate-bounce inline-block">👑</span>
            <h2 className="text-2xl sm:text-3xl font-black text-chobee-navy-950 font-display">
              Quiz Completed, Mayor Cia! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-chobee-navy-700/80 max-w-md mx-auto">
              {scorePct >= 90
                ? '🌟 SSS Rank! Perfect na naman si Mayor Cia! Proud na proud si Baby Bear sa sipag mo!'
                : scorePct >= 70
                ? '🌸 Solid Score! Napakagandang review run, Mayor. Tuloy-tuloy lang sa pag-aral!'
                : '🧸 Good practice! Reviewhin lang natin ang mga na-miss para 100% na next time!'}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
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

            <div className="glass-panel rounded-2xl p-4 text-center bg-purple-50/80 border border-purple-200 shadow-xs">
              <span className="text-[11px] font-black text-purple-600 uppercase">XP Gained</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-700 font-display mt-1">
                +{scoreCount * 25 + (scoreCount === questions.length ? 50 : 0)} ⭐
              </div>
            </div>
          </div>

          {weakTopics.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Recommended Focus Topics:</span>
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

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-500">Practice another round:</span>
              <span className="text-xs font-black text-chobee-pink-600">Choose Quiz Length 🎀</span>
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
                  <span>Review Mistakes ({incorrectAnswers.length})</span>
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
    </div>
  );
};
