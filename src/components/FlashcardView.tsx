import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  Shuffle, 
  Star, 
  Volume2, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Share2, 
  X, 
  ChevronLeft, 
  ChevronRight,
  HelpCircle,
  Keyboard
} from 'lucide-react';
import { StudySet, Flashcard, CardRating } from '../types/study';
import { 
  playFlipSound, 
  playCardSwoosh, 
  playHapticTap, 
  playCelebrationSound, 
  playStreakSound,
  playXpSound,
  playBubblePop,
  speakText, 
  stopSpeaking 
} from '../services/audioService';
import { fireLightCelebration, fireMiniBurst } from '../services/fxService';
import { calculateNextReview } from '../services/spacedRepetition';
import { sanitizeCard } from '../services/storageService';

interface FlashcardViewProps {
  studySet: StudySet;
  onUpdateSet: (updatedSet: StudySet) => void;
  onSwitchMode: (mode: 'quiz' | 'summary' | 'dashboard') => void;
  onOpenShare: (set: StudySet) => void;
  soundEnabled: boolean;
  onCardMasteredReward?: () => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  studySet,
  onUpdateSet,
  onSwitchMode,
  onOpenShare,
  soundEnabled,
  onCardMasteredReward,
}) => {
  const [cards, setCards] = useState<Flashcard[]>(
    (studySet.flashcards || []).map((c, i) => sanitizeCard(c, i))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [floatingXp, setFloatingXp] = useState<{ id: number; text: string } | null>(null);

  const prevSetIdRef = useRef(studySet.id);

  useEffect(() => {
    // Only reset state if the active study set changed (different ID)
    if (prevSetIdRef.current !== studySet.id) {
      prevSetIdRef.current = studySet.id;
      const list = (studySet.flashcards || []).map((c, i) => sanitizeCard(c, i));
      setCards(list);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setSessionCompleted(false);
      setFloatingXp(null);
      stopSpeaking();
    } else if (cards.length === 0 && (studySet.flashcards || []).length > 0) {
      const list = (studySet.flashcards || []).map((c, i) => sanitizeCard(c, i));
      setCards(list);
    } else if (studySet.flashcards && studySet.flashcards.length !== cards.length) {
      const list = studySet.flashcards.map((c, i) => sanitizeCard(c, i));
      setCards(list);
    }
  }, [studySet.id, studySet.flashcards, cards.length]);

  // Clean up speech synthesis whenever card index changes, flips, or unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [currentIndex, isFlipped]);

  const safeIndex = cards.length > 0 ? Math.min(Math.max(0, currentIndex), cards.length - 1) : 0;
  const currentCard = cards[safeIndex] ? sanitizeCard(cards[safeIndex], safeIndex) : null;

  const handleFlip = useCallback(() => {
    stopSpeaking();
    if (soundEnabled) playFlipSound();
    setIsFlipped((prev) => !prev);
  }, [soundEnabled]);

  const handleNext = useCallback(() => {
    stopSpeaking();
    if (soundEnabled) playCardSwoosh();

    if (safeIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setSessionCompleted(true);
      if (soundEnabled) playCelebrationSound();
      fireLightCelebration();
      onUpdateSet({
        ...studySet,
        flashcards: cards,
        lastStudied: new Date().toISOString(),
      });
    }
  }, [safeIndex, cards, soundEnabled, studySet, onUpdateSet]);

  const handlePrev = useCallback(() => {
    stopSpeaking();
    if (safeIndex > 0) {
      if (soundEnabled) playCardSwoosh();
      setCurrentIndex((prev) => Math.max(0, prev - 1));
      setIsFlipped(false);
      setShowHint(false);
      setSessionCompleted(false);
    }
  }, [safeIndex, soundEnabled]);

  const handleRating = useCallback((rating: CardRating) => {
    if (!currentCard) return;

    if (rating === 'easy') {
      if (soundEnabled) playStreakSound(4);
      fireMiniBurst(0.5, 0.45);
      setFloatingXp({ id: Date.now(), text: '+25 XP Mastered! 🌟' });
    } else if (rating === 'good') {
      if (soundEnabled) playXpSound();
      setFloatingXp({ id: Date.now(), text: '+15 XP Medium! 👍' });
    } else if (rating === 'hard') {
      if (soundEnabled) playBubblePop();
      setFloatingXp({ id: Date.now(), text: '+5 XP Hard! ⚡' });
    } else {
      if (soundEnabled) playHapticTap();
      setFloatingXp({ id: Date.now(), text: 'Review Soon 🔄' });
    }

    const updatedCard = calculateNextReview(currentCard, rating);
    if (updatedCard.state === 'mastered' && currentCard.state !== 'mastered') {
      if (onCardMasteredReward) onCardMasteredReward();
    }

    const newCards = [...cards];
    newCards[safeIndex] = updatedCard;
    setCards(newCards);

    const updatedSet: StudySet = {
      ...studySet,
      flashcards: newCards,
      lastStudied: new Date().toISOString(),
    };
    onUpdateSet(updatedSet);

    if (safeIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setSessionCompleted(true);
      if (soundEnabled) playCelebrationSound();
      fireLightCelebration();
    }
  }, [currentCard, cards, safeIndex, studySet, onUpdateSet, onCardMasteredReward, soundEnabled]);

  // Keyboard navigation shortcuts (Space = Flip, ArrowLeft = Prev, ArrowRight/Enter = Next, 1-4 = Ratings)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAiModal) return;

      // Don't intercept if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight' || e.code === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'Digit1' || e.code === 'Numpad1') {
        e.preventDefault();
        handleRating('again');
      } else if (e.code === 'Digit2' || e.code === 'Numpad2') {
        e.preventDefault();
        handleRating('hard');
      } else if (e.code === 'Digit3' || e.code === 'Numpad3') {
        e.preventDefault();
        handleRating('good');
      } else if (e.code === 'Digit4' || e.code === 'Numpad4') {
        e.preventDefault();
        handleRating('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, handleRating, showAiModal]);

  const handleShuffle = () => {
    stopSpeaking();
    if (soundEnabled) playHapticTap();
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionCompleted(false);
  };

  const handleRestart = () => {
    stopSpeaking();
    if (soundEnabled) playHapticTap();
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionCompleted(false);
  };

  const toggleFavorite = () => {
    if (!currentCard) return;
    if (soundEnabled) playHapticTap();
    const updatedCard = { ...currentCard, isFavorite: !currentCard.isFavorite };
    const newCards = [...cards];
    newCards[safeIndex] = updatedCard;
    setCards(newCards);
    onUpdateSet({ ...studySet, flashcards: newCards });
  };

  const handleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;
    speakText(isFlipped ? currentCard.back : currentCard.front);
  };

  if (!currentCard || cards.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-sm font-bold text-chobee-navy-700">No flashcards found in this reviewer.</p>
        <button
          onClick={() => onSwitchMode('dashboard')}
          className="px-4 py-2 rounded-xl bg-pink-100 text-chobee-pink-600 font-bold text-xs"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const masteredInSession = cards.filter((c) => c.state === 'mastered').length;
  const progressPercent = Math.round(((safeIndex + 1) / cards.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSwitchMode('dashboard')}
              className="text-xs font-semibold text-chobee-navy-700/60 hover:text-chobee-pink-600 flex items-center gap-1 transition-colors active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-bold text-chobee-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
              {studySet.category}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-chobee-navy-900 font-display mt-1">
            {studySet.title}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSwitchMode('quiz')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-chobee-blue-600 font-bold text-xs border border-blue-200 transition-all active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Practice Quiz ({studySet.quizQuestions.length})</span>
          </button>

          <button
            onClick={() => onSwitchMode('summary')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-all active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Study Guide</span>
          </button>

          <button
            onClick={() => onOpenShare(studySet)}
            title="Share with Classmates"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Counter & Stationery Style Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-chobee-navy-700">
          <span className="flex items-center gap-2">
            <span className="bg-white px-2.5 py-1 rounded-lg border border-pink-200 shadow-xs font-display">
              Card {safeIndex + 1} of {cards.length}
            </span>
            <span className="text-[11px] text-chobee-pink-600 font-semibold">
              ({masteredInSession} mastered)
            </span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShuffle}
              title="Shuffle Cards"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-chobee-navy-900 transition-colors active:scale-90"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              onClick={handleRestart}
              title="Restart Deck"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-chobee-navy-900 transition-colors active:scale-90"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

       {/* 3D FLASHCARD: PRISTINE MINIMALIST AESTHETIC CARD */}
      {!sessionCompleted ? (
        <div 
          className="relative w-full max-w-3xl mx-auto min-h-[380px] sm:min-h-[440px] select-none pt-2 deck-stack-shadow"
          style={{ perspective: '1200px' }}
        >
          {/* Floating XP Reward Indicator */}
          {floatingXp && (
            <div key={floatingXp.id} className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-xp">
              <div className="px-4 py-2 rounded-full bg-chobee-navy-900 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-1.5 border border-slate-700">
                <span>{floatingXp.text}</span>
              </div>
            </div>
          )}

          <div key={safeIndex} className="w-full h-full">
            <div
              onClick={handleFlip}
              style={{
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="relative w-full min-h-[380px] sm:min-h-[440px] cursor-pointer"
            >
              {/* FRONT FACE */}
              <div 
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(0deg)',
                  pointerEvents: isFlipped ? 'none' : 'auto',
                }}
                className="absolute inset-0 w-full h-full flex flex-col justify-between rounded-3xl bg-white border border-slate-200/90 shadow-card p-6 sm:p-10 transition-shadow hover:shadow-card-hover"
              >
                {/* Front Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-chobee-pink-600 bg-chobee-pink-50 px-3 py-1 rounded-full border border-chobee-pink-100">
                    {currentCard.category || studySet.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSpeech}
                      title="Audio Pronunciation"
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-chobee-navy-900 transition-colors active:scale-95"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite();
                      }}
                      className={`p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors active:scale-95 ${
                        currentCard.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-400 hover:text-amber-400'
                      }`}
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Front Content */}
                <div className="text-center py-6 px-4 space-y-4 my-auto">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Question / Term
                  </span>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-chobee-navy-900 font-display leading-snug max-w-xl mx-auto">
                    {currentCard.front}
                  </h2>

                  {currentCard.hint && (
                    <div className="pt-2">
                      {showHint ? (
                        <div className="inline-block p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-medium text-amber-900 animate-fadeIn">
                          💡 Clue: {currentCard.hint}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (soundEnabled) playHapticTap();
                            setShowHint(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-amber-700 bg-slate-50 hover:bg-amber-50 px-3 py-1 rounded-full border border-slate-200 hover:border-amber-200 transition-all active:scale-95"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Need a hint?</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Front Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Space to flip</span>
                  </span>
                  <span className="text-chobee-pink-600 font-semibold flex items-center gap-1">
                    <span>Show answer</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>

              {/* BACK FACE */}
              <div 
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  pointerEvents: isFlipped ? 'auto' : 'none',
                }}
                className="absolute inset-0 w-full h-full flex flex-col justify-between rounded-3xl bg-white border border-slate-200/90 shadow-card p-6 sm:p-10 transition-shadow hover:shadow-card-hover"
              >
                {/* Back Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-chobee-blue-600 bg-chobee-blue-50 px-3 py-1 rounded-full border border-chobee-blue-100">
                    Definition & Concept
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSpeech}
                      title="Audio Pronunciation"
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-chobee-navy-900 transition-colors active:scale-95"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (soundEnabled) playHapticTap();
                        setShowAiModal(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-chobee-pink-50 hover:bg-chobee-pink-100 text-xs font-bold text-chobee-pink-600 border border-chobee-pink-200 transition-all active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI Explain</span>
                    </button>
                  </div>
                </div>

                {/* Back Content */}
                <div className="text-center py-6 px-4 space-y-3 my-auto">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Answer
                  </span>
                  <p className="text-base sm:text-lg md:text-xl font-medium text-slate-800 leading-relaxed font-sans whitespace-pre-line max-h-56 overflow-y-auto px-4 max-w-xl mx-auto">
                    {currentCard.back}
                  </p>
                </div>

                {/* Back Footer */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Keyboard className="w-3.5 h-3.5" />
                    <span>Space to flip</span>
                  </span>
                  <span className="text-chobee-pink-600 font-semibold flex items-center gap-1">
                    <span>&larr;</span>
                    <span>Back to question</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Deck Completed Screen */
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center space-y-6 border border-slate-200/90 shadow-card animate-fadeIn max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-chobee-pink-50 text-chobee-pink-500 mx-auto flex items-center justify-center text-3xl shadow-xs">
            🎉
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-chobee-navy-900 font-display">
              Deck Completed!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              You reviewed all {cards.length} flashcards in this deck. Great job keeping your streak active!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-chobee-navy-900 font-semibold text-xs border border-slate-200 transition-all active:scale-95"
            >
              <RotateCw className="w-4 h-4 text-chobee-pink-500" />
              <span>Review Again</span>
            </button>
            <button
              onClick={() => onSwitchMode('quiz')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-semibold text-xs shadow-soft-pink transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Take Practice Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation & Spaced Repetition Rating Controls */}
      {!sessionCompleted && (
        <div className="space-y-3 pt-2 max-w-3xl mx-auto">
          {isFlipped ? (
            <div className="space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-600">
                  How well did you remember this?
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                  Keyboard shortcuts: 1, 2, 3, 4
                </span>
              </div>

              {/* 4 Gamified Rating Buttons: Again, Hard, Good, Easy */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRating('again')}
                  className="p-3 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-rose-700 font-bold flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs"
                >
                  <span className="text-sm flex items-center gap-1.5">
                    <span>🔄</span>
                    <span>Again</span>
                  </span>
                  <span className="text-[10px] text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                    [1] Soon
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating('hard')}
                  className="p-3 rounded-2xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-amber-800 font-bold flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs"
                >
                  <span className="text-sm flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Hard</span>
                  </span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    [2] 1 day
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating('good')}
                  className="p-3 rounded-2xl bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-700 font-bold flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs"
                >
                  <span className="text-sm flex items-center gap-1.5">
                    <span>👍</span>
                    <span>Good</span>
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    [3] 3 days
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRating('easy')}
                  className="p-3 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-700 font-bold flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs"
                >
                  <span className="text-sm flex items-center gap-1.5">
                    <span>🌟</span>
                    <span>Easy</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    [4] 5 days
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* Front Navigation Bar: Prev, Flip, Next */
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                onClick={handlePrev}
                disabled={safeIndex === 0}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                  safeIndex === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleFlip}
                className="flex-1 max-w-xs px-6 py-2.5 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white text-xs sm:text-sm font-semibold shadow-soft-pink transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Flip Card</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md hidden sm:inline">Space</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-95"
              >
                <span>{safeIndex === cards.length - 1 ? 'Finish' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Concept Breakdown Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-4 animate-scaleIn">
            <button
              onClick={() => setShowAiModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-chobee-pink-50 text-chobee-pink-600 flex items-center justify-center text-xl">
                ✨
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-chobee-navy-900">
                  AI Concept Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Conceptual explanation and memory cues
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-chobee-navy-900">
              Concept: {currentCard.front}
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-normal bg-[#FAF9F6] p-4 rounded-xl border border-slate-200/60">
              {currentCard.aiExplanation ||
                `Here is a simple breakdown of "${currentCard.front}": ${currentCard.back} Think about how this applies in real-world scenarios to help remember it during exam time! 🌸`}
            </p>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white text-xs font-semibold shadow-soft-pink active:scale-95"
              >
                Understood!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
