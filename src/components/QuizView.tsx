import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  const prevQuizSetIdRef = useRef(studySet.id);
  const prevQuizSizeRef = useRef(quizSize);

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
    }
  }, [studySet.id, quizSize, questions.length]);

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
          className="text-xs font-semibold text-slate-500 hover:text-chobee-pink-600 flex items-center gap-1.5 transition-colors active:scale-95 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Flashcards</span>
        </button>

        {!isQuizCompleted && (
          <div className="flex items-center gap-2.5">
            {streak > 0 && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-xs transition-all ${
                  streak >= 3
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 shadow-glow-dual animate-pulse'
                    : 'bg-orange-50 text-orange-600 border-orange-200'
                }`}
              >
                <Flame className={`w-3.5 h-3.5 ${streak >= 3 ? 'fill-white' : 'fill-orange-500'}`} />
                <span>{streak >= 5 ? `🔥 ${streak}x Unstoppable` : streak >= 3 ? `⚡ ${streak}x Combo` : `${streak} Streak`}</span>
              </div>
            )}
            <span className="text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
        )}
      </div>

      {/* Quiz Size / Length Selector Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500" />
            <span>Quiz Length:</span>
          </span>
          <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
            Choose how many questions to practice
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {[5, 10, 30, 50].map((count) => {
            const isSelected = quizSize === count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => handleSetQuizSize(count)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs scale-105'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
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
          {/* Floating XP Reward Indicator */}
          {floatingXp && (
            <div key={floatingXp.id} className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-xp">
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-pink-500 to-purple-600 text-white font-bold text-sm shadow-xl flex items-center gap-2 border border-white/80">
                <span>{floatingXp.text}</span>
              </div>
            </div>
          )}

          {/* Question Card */}
          <div
            key={currentIndex}
            className={`bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card transition-all duration-300 ${
              cardShake ? 'animate-gizmo-shake border-rose-400' : ''
            }`}
          >
            <div className="space-y-6">
              {/* Question Header & Type */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-chobee-pink-600 bg-chobee-pink-50 px-3 py-1 rounded-full border border-chobee-pink-100">
                  {currentQ.topicCategory || studySet.category}
                </span>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {currentQ.type === 'true_false'
                    ? 'True or False'
                    : currentQ.type === 'identification'
                    ? 'Identification'
                    : 'Multiple Choice'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              {/* Question Prompt */}
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display leading-snug">
                {currentQ.question}
              </h2>

              {/* Options or Text Input */}
              <div className="space-y-3 pt-2">
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
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:border-chobee-pink-400 bg-slate-50/50 focus:bg-white text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-2xs transition-all"
                    />
                    {!isAnswerSubmitted ? (
                      <button
                        onClick={() => evaluateAnswer(typedAnswer)}
                        disabled={!typedAnswer.trim()}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                      >
                        Submit Answer
                      </button>
                    ) : null}
                  </div>
                ) : (
                  (currentQ.options || ['True', 'False']).map((option, idx) => {
                    const isSelected = selectedOption === option;
                    const isTarget = option === currentQ.correctAnswer;
                    const keyLabel = ['A', 'B', 'C', 'D'][idx] || String.fromCharCode(65 + idx);

                    let optionStyle =
                      'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800 shadow-2xs hover:shadow-xs';

                    if (!isAnswerSubmitted) {
                      if (isSelected) {
                        optionStyle = 'bg-chobee-pink-50 border-chobee-pink-400 text-chobee-pink-700 shadow-sm ring-2 ring-chobee-pink-200';
                      }
                    } else {
                      if (isTarget) {
                        optionStyle = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm ring-2 ring-emerald-200';
                      } else if (isSelected && !isCorrect) {
                        optionStyle = 'bg-rose-50 border-rose-300 text-rose-800 line-through ring-2 ring-rose-200 opacity-90';
                      } else {
                        optionStyle = 'bg-slate-50/60 border-slate-200/60 text-slate-400 opacity-40';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={isAnswerSubmitted}
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-left p-4 rounded-2xl border-2 text-sm sm:text-base font-semibold transition-all duration-200 flex items-center justify-between active:scale-[0.98] group relative ${optionStyle}`}
                      >
                        <div className="flex items-center gap-3.5 flex-1">
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                              isAnswerSubmitted && isTarget
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : isAnswerSubmitted && isSelected && !isCorrect
                                ? 'bg-rose-200 text-rose-800'
                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                            }`}
                          >
                            {keyLabel}
                          </span>
                          <span className="leading-snug">{option}</span>
                        </div>

                        {isAnswerSubmitted && isTarget && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 ml-2" />
                        )}
                        {isAnswerSubmitted && isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Explanation Callout */}
              {isAnswerSubmitted && (
                <div
                  className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-1.5 transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/80 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Great job! That's correct! ✨</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Not quite. Correct answer: {currentQ.correctAnswer} 💡</span>
                      </>
                    )}
                  </div>
                  <p className="leading-relaxed opacity-95 pl-6">{currentQ.explanation}</p>
                </div>
              )}

              {/* Next / Continue Button */}
              {isAnswerSubmitted && (
                <div className="pt-2">
                  <button
                    onClick={handleNextQuestion}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm sm:text-base transition-all shadow-xs active:scale-95 flex items-center justify-center gap-2 ${
                      isCorrect
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Results'}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="text-xs opacity-75 font-normal bg-white/20 px-2 py-0.5 rounded-full ml-1 hidden sm:inline">
                      Press Space
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* QUIZ RESULTS SUMMARY */
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-card space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl inline-block">🎉</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              Quiz Completed!
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {scorePct >= 90
                ? 'Outstanding performance! You have mastered these concepts.'
                : scorePct >= 70
                ? 'Great job! You have a solid grasp on most questions.'
                : 'Good practice run! Reviewing your mistakes will help reinforce key concepts.'}
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-chobee-pink-50/50 rounded-2xl p-4 text-center border border-chobee-pink-100">
              <span className="text-[11px] font-bold text-chobee-pink-600 uppercase tracking-wide">Score</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-1">
                {scoreCount} / {questions.length}
              </div>
            </div>

            <div className="bg-chobee-blue-50/50 rounded-2xl p-4 text-center border border-chobee-blue-100">
              <span className="text-[11px] font-bold text-chobee-blue-600 uppercase tracking-wide">Accuracy</span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-display mt-1">
                {scorePct}%
              </div>
            </div>

            <div className="bg-purple-50/50 rounded-2xl p-4 text-center border border-purple-100">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wide">XP Gained</span>
              <div className="text-2xl sm:text-3xl font-bold text-purple-700 font-display mt-1">
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
                    className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white text-amber-900 border border-amber-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-700">Practice another round:</span>
              <span className="text-xs font-medium text-slate-500">Select question count</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[5, 10, 30, 50].map((num) => (
                <button
                  key={num}
                  onClick={() => handleRestartQuiz(num)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                    quizSize === num
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-95 ml-auto"
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
