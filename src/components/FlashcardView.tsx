import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Shuffle, 
  Star, 
  Volume2, 
  HelpCircle, 
  Sparkles, 
  CheckCircle2, 
  FileText, 
  Keyboard, 
  Share2, 
  X, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { StudySet, Flashcard, CardRating } from '../types/study';
import { calculateNextReview } from '../services/spacedRepetition';
import { playFlipSound, playCardSwoosh, playHapticTap, playBubblePop, playXpSound, playStreakSound, speakText, stopSpeaking } from '../services/audioService';
import { fireMiniBurst } from '../services/fxService';
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

  useEffect(() => {
    const list = (studySet.flashcards || []).map((c, i) => sanitizeCard(c, i));
    setCards(list);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSessionCompleted(false);
    setFloatingXp(null);
    stopSpeaking();
  }, [studySet]);

  // Clean up speech synthesis whenever card index changes, flips, or unmounts
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [currentIndex, isFlipped]);

  const currentCard = sanitizeCard(cards[currentIndex] || cards[0], currentIndex);

  const handleFlip = useCallback(() => {
    stopSpeaking();
    if (soundEnabled) playFlipSound();
    setIsFlipped((prev) => !prev);
  }, [soundEnabled]);

  const handleNext = useCallback(() => {
    stopSpeaking();
    if (soundEnabled) playCardSwoosh();
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      setSessionCompleted(true);
    }
  }, [currentIndex, cards.length, soundEnabled]);

  const handlePrev = useCallback(() => {
    stopSpeaking();
    if (currentIndex > 0) {
      if (soundEnabled) playCardSwoosh();
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
      setShowHint(false);
      setSessionCompleted(false);
    }
  }, [currentIndex, soundEnabled]);

  const handleRating = useCallback((rating: CardRating) => {
    if (!currentCard) return;

    if (rating === 'easy') {
      if (soundEnabled) playStreakSound(4);
      fireMiniBurst(0.5, 0.45);
      setFloatingXp({ id: Date.now(), text: '+25 XP Mastered! 🌟' });
    } else if (rating === 'good') {
      if (soundEnabled) playXpSound();
      setFloatingXp({ id: Date.now(), text: '+15 XP Good! 👍' });
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
    newCards[currentIndex] = updatedCard;
    setCards(newCards);

    const updatedSet: StudySet = {
      ...studySet,
      flashcards: newCards,
      lastStudied: new Date().toISOString(),
    };
    onUpdateSet(updatedSet);

    handleNext();
  }, [currentCard, cards, currentIndex, studySet, onUpdateSet, onCardMasteredReward, handleNext, soundEnabled]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAiModal) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
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
    newCards[currentIndex] = updatedCard;
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
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

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
              Card {currentIndex + 1} of {cards.length}
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

      {/* 3D FLASHCARD: AUTHENTIC WIDE PINK LINED STATIONERY (NOT CUT OFF) */}
      {!sessionCompleted ? (
        <div className="relative perspective-1000 w-full max-w-4xl mx-auto min-h-[440px] sm:min-h-[480px] md:min-h-[500px] select-none pt-2 deck-stack-shadow">
          {/* Floating XP Reward Indicator (Gizmo Style) */}
          {floatingXp && (
            <div key={floatingXp.id} className="absolute top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-float-xp">
              <div className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 text-white font-black text-sm sm:text-base shadow-2xl flex items-center gap-2 border-2 border-white/90 backdrop-blur-md">
                <span>{floatingXp.text}</span>
              </div>
            </div>
          )}
          <div
            onClick={handleFlip}
            style={{
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
            }}
            className="relative w-full min-h-[440px] sm:min-h-[480px] md:min-h-[500px] cursor-pointer"
          >
            {/* FRONT FACE (Full Wide Pink Flashcard with Washi Tape & Notebook Lines) */}
            <div 
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg)',
                zIndex: isFlipped ? 1 : 2,
                backgroundImage: "url('/assets/wide_pink_flashcard.png')",
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
              className="absolute inset-0 w-full h-full flex flex-col justify-between rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl border-2 border-pink-300/80 pt-10 sm:pt-12 pb-6 sm:pb-8 px-8 sm:px-14 md:px-16"
            >
              {/* Front Header */}
              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-chobee-pink-700 bg-white/95 px-3.5 py-1 rounded-full border border-pink-300 shadow-xs backdrop-blur-md">
                  {currentCard.category || studySet.category}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleSpeech}
                    title="Audio Pronunciation"
                    className="p-2 rounded-full bg-white/95 hover:bg-white text-slate-600 hover:text-chobee-pink-600 border border-pink-200 shadow-2xs transition-colors active:scale-90"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite();
                    }}
                    className={`p-2 rounded-full bg-white/95 hover:bg-white border border-pink-200 shadow-2xs transition-colors active:scale-90 ${
                      currentCard.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Front Content */}
              <div className="text-center py-4 px-4 space-y-3 relative z-10 my-auto">
                <span className="text-[11px] font-black text-chobee-pink-600 uppercase tracking-widest bg-white/90 px-3.5 py-1 rounded-full border border-pink-200/90 shadow-2xs inline-block">
                  Question / Term 🌸
                </span>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-chobee-navy-950 font-display leading-snug drop-shadow-xs max-w-2xl mx-auto">
                  {currentCard.front}
                </h2>

                {currentCard.hint && (
                  <div className="pt-2">
                    {showHint ? (
                      <div className="inline-block p-3 rounded-2xl bg-white/95 border border-amber-300 text-xs font-medium text-amber-900 shadow-sm animate-fadeIn">
                        💡 Clue: {currentCard.hint}
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (soundEnabled) playHapticTap();
                          setShowHint(true);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100/90 px-3.5 py-1 rounded-full border border-amber-300 shadow-2xs transition-all active:scale-95"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Need a hint?</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Front Footer */}
              <div className="flex items-center justify-between text-xs text-chobee-navy-900/80 pt-2 border-t border-pink-300/60 relative z-10 bg-white/80 backdrop-blur-sm -mx-2 px-3.5 py-2 rounded-2xl border border-pink-200/70 shadow-2xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Keyboard className="w-3.5 h-3.5 text-chobee-pink-500" />
                  <span>Tap or Spacebar to Flip</span>
                </span>
                <span className="text-chobee-pink-600 font-black font-display">
                  Turn card for answer →
                </span>
              </div>
            </div>

            {/* BACK FACE (Full Wide Pink Flashcard with Washi Tape & Notebook Lines) */}
            <div 
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                zIndex: isFlipped ? 2 : 1,
                backgroundImage: "url('/assets/wide_pink_flashcard.png')",
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
              className="absolute inset-0 w-full h-full flex flex-col justify-between rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-2xl border-2 border-pink-300/80 pt-10 sm:pt-12 pb-6 sm:pb-8 px-8 sm:px-14 md:px-16"
            >
              {/* Back Header */}
              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider text-chobee-pink-700 bg-white/95 px-3.5 py-1 rounded-full border border-pink-300 shadow-xs backdrop-blur-md">
                  Answer & Concept 🎀
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSpeech}
                    title="Audio Pronunciation"
                    className="p-2 rounded-full bg-white/95 hover:bg-white text-slate-600 hover:text-chobee-pink-600 border border-pink-200 shadow-2xs transition-colors active:scale-90"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (soundEnabled) playHapticTap();
                      setShowAiModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/95 hover:bg-white text-xs font-bold text-chobee-pink-600 border border-pink-300 shadow-xs transition-all active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500" />
                    <span>AI Explain (Taglish)</span>
                  </button>
                </div>
              </div>

              {/* Back Content */}
              <div className="text-center py-4 px-4 space-y-3 relative z-10 my-auto">
                <span className="text-[11px] font-black text-chobee-pink-600 uppercase tracking-widest bg-white/90 px-3.5 py-1 rounded-full border border-pink-200/90 shadow-2xs inline-block">
                  Definition & Explanation ✨
                </span>
                <p className="text-base sm:text-lg md:text-xl font-bold text-chobee-navy-950 leading-relaxed font-sans whitespace-pre-line max-h-56 overflow-y-auto px-4 max-w-2xl mx-auto drop-shadow-xs">
                  {currentCard.back}
                </p>
              </div>

              {/* Back Footer */}
              <div className="flex items-center justify-between text-xs text-chobee-navy-900/80 pt-2 border-t border-pink-300/60 relative z-10 bg-white/80 backdrop-blur-sm -mx-2 px-3.5 py-2 rounded-2xl border border-pink-200/70 shadow-2xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Keyboard className="w-3.5 h-3.5 text-chobee-pink-500" />
                  <span>Tap or Spacebar to Flip</span>
                </span>
                <span className="text-chobee-pink-600 font-black font-display">
                  ← Back to question
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Deck Completed Screen */
        <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center space-y-6 border border-pink-200 shadow-soft-pink animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-chobee-pink-400 to-chobee-blue-400 mx-auto flex items-center justify-center text-4xl shadow-glow-dual animate-bounce">
            🎉
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-chobee-navy-900 font-display">
              Ang galing mo, Mayor Cia! 🌸
            </h2>
            <p className="text-sm text-chobee-navy-700 leading-relaxed">
              Natapos mo ang lahat ng {cards.length} cards sa reviewer na ito. Super proud si Baby Bear sa sipag mo mag-aral!
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-chobee-navy-800 font-bold text-sm border border-slate-200 shadow-sm transition-all active:scale-95"
            >
              <RotateCw className="w-4 h-4 text-chobee-pink-500" />
              <span>Review Deck Again</span>
            </button>
            <button
              onClick={() => onSwitchMode('quiz')}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white font-bold text-sm shadow-soft-pink transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Take Practice Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation & Gizmo Spaced Repetition Rating Controls */}
      {!sessionCompleted && (
        <div className="space-y-3 pt-2">
          {isFlipped ? (
            <div className="space-y-2 animate-pop-card-in">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-chobee-navy-700/75 flex items-center gap-1.5">
                  <span>How well did you know this, Mayor Cia?</span>
                  <span className="text-pink-500">🌸</span>
                </span>
                <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">
                  Shortcuts: Press 1, 2, 3, or 4
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleRating('again')}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-rose-50/90 border-2 border-rose-200 hover:border-rose-400 text-rose-700 font-black flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs group"
                >
                  <span className="text-sm sm:text-base flex items-center gap-1.5">
                    <span>🔄</span>
                    <span>Again</span>
                  </span>
                  <span className="text-[10px] text-rose-500 font-bold bg-rose-100/70 px-2 py-0.5 rounded-full group-hover:bg-rose-200/80">
                    [1] Review Soon
                  </span>
                </button>

                <button
                  onClick={() => handleRating('hard')}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-amber-50/90 border-2 border-amber-200 hover:border-amber-400 text-amber-800 font-black flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs group"
                >
                  <span className="text-sm sm:text-base flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Hard</span>
                  </span>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-100/70 px-2 py-0.5 rounded-full group-hover:bg-amber-200/80">
                    [2] +5 XP
                  </span>
                </button>

                <button
                  onClick={() => handleRating('good')}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-sky-50/90 border-2 border-sky-200 hover:border-sky-400 text-sky-800 font-black flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs group"
                >
                  <span className="text-sm sm:text-base flex items-center gap-1.5">
                    <span>👍</span>
                    <span>Good</span>
                  </span>
                  <span className="text-[10px] text-sky-600 font-bold bg-sky-100/70 px-2 py-0.5 rounded-full group-hover:bg-sky-200/80">
                    [3] +15 XP
                  </span>
                </button>

                <button
                  onClick={() => handleRating('easy')}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white hover:bg-emerald-50/95 border-2 border-emerald-300 hover:border-emerald-400 text-emerald-800 font-black flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xs ring-2 ring-emerald-200/60 group"
                >
                  <span className="text-sm sm:text-base flex items-center gap-1.5">
                    <span>🌟</span>
                    <span>Easy</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full group-hover:bg-emerald-200">
                    [4] +25 XP ✨
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ${
                  currentIndex === 0
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                    : 'bg-white hover:bg-slate-50 text-chobee-navy-900 border border-slate-200 shadow-xs'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={handleFlip}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-chobee-pink-500 to-rose-500 hover:from-chobee-pink-600 hover:to-rose-600 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                <span>Show Answer</span>
                <span className="text-[10px] opacity-80 font-normal bg-white/20 px-2 py-0.5 rounded-full">Space</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white text-xs font-bold shadow-xs transition-all active:scale-95"
              >
                <span>{currentIndex === cards.length - 1 ? 'Finish Deck' : 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Warm Taglish "AI Explain" Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/60 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-pink-200 shadow-glow-dual space-y-4">
            <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto -mt-2 mb-2" />

            <button
              onClick={() => setShowAiModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-chobee-navy-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-400 to-blue-400 flex items-center justify-center text-xl shadow-soft-pink">
                🧸
              </div>
              <div>
                <h3 className="font-display font-extrabold text-lg text-chobee-navy-900">
                  Chobee’s Taglish AI Breakdown
                </h3>
                <p className="text-xs text-chobee-pink-600 font-semibold">
                  Personalized explanation for Mayor Cia
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-pink-50/70 border border-pink-200 text-xs font-bold text-chobee-navy-800">
              Topic: {currentCard.front}
            </div>

            <p className="text-sm text-chobee-navy-800 leading-relaxed font-medium bg-white/90 p-4 rounded-2xl border border-slate-100 shadow-xs">
              {currentCard.aiExplanation ||
                `Mayor, ganito lang yan: Ang "${currentCard.front}" ay tungkol sa ${currentCard.back.toLowerCase()}. Tandaan mo lang kung paano ito ginagamit sa totoong buhay para hindi mo makalimutan sa exam. You are doing amazing! 🧸🩵`}
            </p>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 text-white text-xs font-bold shadow-soft-pink active:scale-95"
              >
                Got it, Baby Bear! 🌸
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
