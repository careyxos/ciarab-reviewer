import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Wind, 
  ArrowRight, 
  Share2, 
  FileText, 
  Play, 
  Pause, 
  Upload, 
  Layers, 
  Volume2, 
  Disc, 
  Search, 
  X, 
  Zap,
  Sparkles,
  Droplets,
  BookOpen
} from 'lucide-react';
import { StudySet, UserStats } from '../types/study';
import { isCardDue } from '../services/spacedRepetition';
import { lofiPlayer, playHapticTap } from '../services/audioService';
import { BiomeTheme } from '../App';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  studySets: StudySet[];
  stats: UserStats;
  onSelectSet: (set: StudySet, mode: 'flashcards' | 'quiz' | 'summary') => void;
  onOpenUpload: () => void;
  onOpenShare: (set: StudySet) => void;
  onAddWater?: () => void;
  onOpenMonthsary: () => void;
  onNavigateToUsage?: () => void;
  currentBiome?: BiomeTheme;
  onSelectBiome?: (theme: BiomeTheme) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  studySets,
  stats,
  onSelectSet,
  onOpenUpload,
  onOpenShare,
  onAddWater,
  onNavigateToUsage,
}) => {
  const { user, dailyUsage } = useAuth();

  // Breathing Widget State
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  // Vinyl Lofi Player State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.25);

  // Search Query for Reviewers
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const breathInterval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          setBreathPhase((current) => {
            if (current === 'Inhale') return 'Hold';
            if (current === 'Hold') return 'Exhale';
            return 'Inhale';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(breathInterval);
    };
  }, []);

  const toggleMusic = () => {
    playHapticTap();
    if (isMusicPlaying) {
      lofiPlayer.stop();
      setIsMusicPlaying(false);
    } else {
      lofiPlayer.play();
      setIsMusicPlaying(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMusicVolume(val);
    lofiPlayer.setVolume(val);
  };

  // Compute total due cards across all sets
  const allDueCards = studySets.flatMap((s) => s.flashcards.filter((c) => isCardDue(c)));
  const totalDueCount = allDueCards.length;

  const totalCardsAcrossSets = studySets.reduce((acc, s) => acc + s.flashcards.length, 0);

  const filteredStudySets = studySets.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  const featuredSet = studySets[0] || null;

  return (
    <div className="space-y-6 pb-20 sm:pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
      {/* 1. Welcome & Daily Readiness Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-chobee-pink-50 text-chobee-pink-600 font-semibold text-xs border border-chobee-pink-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cozy Study Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-chobee-navy-900 font-display tracking-tight">
            Ready to study, {user ? user.displayName : 'Ciara'}? 🌸
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-normal leading-relaxed">
            Turn your study notes into smart flashcards, practice quizzes, and structured summaries.
          </p>
        </div>

        {/* Daily Token HUD Glance */}
        <div className="w-full md:w-auto flex-1 max-w-sm bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-chobee-pink-500 fill-chobee-pink-400" />
              <span>Daily AI Tokens</span>
            </span>
            <span className="font-mono text-chobee-navy-900 font-bold">
              {user?.role === 'admin' ? 'Unlimited' : `${dailyUsage.remaining} / ${dailyUsage.allocated}`}
            </span>
          </div>

          {user?.role !== 'admin' && (
            <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-chobee-pink-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Math.round((dailyUsage.remaining / dailyUsage.allocated) * 100)))}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Resets in: <strong className="text-slate-700 font-mono">{dailyUsage.resetCountdown}</strong></span>
            {onNavigateToUsage && (
              <button
                onClick={onNavigateToUsage}
                className="text-chobee-pink-600 hover:text-chobee-pink-700 font-semibold"
              >
                Usage Log &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Quick Actions Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={onOpenUpload}
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all text-left group active:scale-98 flex flex-col justify-between h-28"
        >
          <div className="w-9 h-9 rounded-xl bg-chobee-pink-50 text-chobee-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-chobee-navy-900">Upload Notes</div>
            <div className="text-[11px] text-slate-400 font-normal">PDF, DOCX, or text</div>
          </div>
        </button>

        <button
          onClick={() => featuredSet && onSelectSet(featuredSet, 'flashcards')}
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all text-left group active:scale-98 flex flex-col justify-between h-28"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-chobee-navy-900">Flashcards</div>
            <div className="text-[11px] text-slate-400 font-normal">{totalCardsAcrossSets} total cards</div>
          </div>
        </button>

        <button
          onClick={() => featuredSet && onSelectSet(featuredSet, 'quiz')}
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all text-left group active:scale-98 flex flex-col justify-between h-28"
        >
          <div className="w-9 h-9 rounded-xl bg-chobee-blue-50 text-chobee-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-chobee-navy-900">Practice Quiz</div>
            <div className="text-[11px] text-slate-400 font-normal">{stats.quizzesCompleted} tests taken</div>
          </div>
        </button>

        <button
          onClick={() => featuredSet && onSelectSet(featuredSet, 'summary')}
          className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all text-left group active:scale-98 flex flex-col justify-between h-28"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-chobee-navy-900">Study Guides</div>
            <div className="text-[11px] text-slate-400 font-normal">Synthesized notes</div>
          </div>
        </button>
      </div>

      {/* 3. Due For Review Spaced Repetition Alert (if cards due) */}
      {totalDueCount > 0 && (
        <div className="bg-gradient-to-r from-pink-50 via-white to-blue-50 border border-pink-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-chobee-pink-500 text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-chobee-navy-900">
                Spaced Repetition: {totalDueCount} Cards Due for Review
              </h4>
              <p className="text-[11px] text-slate-500">
                Strengthen memory retention by reviewing your scheduled cards today.
              </p>
            </div>
          </div>
          <button
            onClick={() => featuredSet && onSelectSet(featuredSet, 'flashcards')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-soft-pink transition-all active:scale-95 whitespace-nowrap"
          >
            <span>Review Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Continue Studying Spotlight & Cozy Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col (7 cols): Active / Featured Study Set */}
        {featuredSet ? (
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-card flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-chobee-pink-600 bg-chobee-pink-50 px-2.5 py-0.5 rounded-full border border-chobee-pink-100">
                  {featuredSet.category}
                </span>
                <span className="text-xs text-slate-400 font-medium">Continue studying</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-chobee-navy-900 font-display">
                {featuredSet.title}
              </h2>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-normal">
                {featuredSet.description || `${featuredSet.flashcards.length} cards and practice exam questions.`}
              </p>
            </div>

            {/* Deck Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Mastery Progress</span>
                <span className="font-bold text-chobee-navy-900">
                  {Math.round((featuredSet.flashcards.filter((c) => c.state === 'mastered').length / Math.max(1, featuredSet.flashcards.length)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 transition-all duration-500"
                  style={{ width: `${Math.round((featuredSet.flashcards.filter((c) => c.state === 'mastered').length / Math.max(1, featuredSet.flashcards.length)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => onSelectSet(featuredSet, 'flashcards')}
                className="flex-1 min-w-[130px] flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-semibold text-xs shadow-soft-pink transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Study Flashcards</span>
              </button>

              <button
                onClick={() => onSelectSet(featuredSet, 'quiz')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-chobee-navy-900 font-semibold text-xs border border-slate-200 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-chobee-blue-500" />
                <span>Take Quiz</span>
              </button>

              <button
                onClick={() => onSelectSet(featuredSet, 'summary')}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-chobee-navy-900 font-semibold text-xs border border-slate-200 transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Guide</span>
              </button>

              <button
                onClick={() => onOpenShare(featuredSet)}
                title="Share Reviewer"
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-chobee-navy-900 border border-slate-200 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-card text-center space-y-3 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-50 text-chobee-pink-500 flex items-center justify-center text-2xl">
              📚
            </div>
            <h3 className="font-bold text-chobee-navy-900 font-display">No study materials yet</h3>
            <p className="text-xs text-slate-500 max-w-xs">Upload your first document or lecture notes to create flashcards and quizzes.</p>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-semibold text-xs shadow-soft-pink"
            >
              + Create First Study Set
            </button>
          </div>
        )}

        {/* Right Col (5 cols): Cozy Study Workspace Widgets */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mini Lofi Player Widget */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-chobee-pink-500" />
                <span>Cozy Study Music</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {isMusicPlaying ? 'Playing' : 'Paused'}
              </span>
            </div>

            <div className="flex items-center gap-3 py-1">
              {/* Spinning Disc */}
              <div className={`w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-700 shadow-sm flex items-center justify-center shrink-0 ${isMusicPlaying ? 'animate-spin-slow' : 'paused-spin'}`}>
                <div className="w-4 h-4 rounded-full bg-pink-300 border border-white flex items-center justify-center text-[8px]">
                  🎀
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-chobee-navy-900 truncate">花 (FLOWER) — Study Chords</div>
                <div className="text-[11px] text-slate-500 truncate">Relaxing lofi ambient study beats</div>
              </div>

              <button
                onClick={toggleMusic}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-95 shrink-0 ${
                  isMusicPlaying
                    ? 'bg-chobee-pink-500 text-white shadow-soft-pink'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {isMusicPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
            </div>

            {/* Volume slider */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={handleVolumeChange}
                className="w-full h-1 accent-chobee-pink-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Calming Focus Breathing Guide */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-card flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Wind className="w-3.5 h-3.5 text-chobee-blue-500" />
                <span>Focus Breathing Guide</span>
              </div>
              <p className="text-[11px] text-slate-500 max-w-[200px]">
                {breathPhase === 'Inhale' && 'Breathe in calmness...'}
                {breathPhase === 'Hold' && 'Hold gently and center your mind...'}
                {breathPhase === 'Exhale' && 'Release all exam tension...'}
              </p>
            </div>

            {/* Breathing Circle */}
            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
              <div 
                className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                  breathPhase === 'Inhale'
                    ? 'bg-pink-100 scale-110'
                    : breathPhase === 'Hold'
                    ? 'bg-purple-100 scale-110'
                    : 'bg-blue-50 scale-90'
                }`}
              />
              <div className="relative z-10 text-center">
                <div className="text-[9px] font-bold uppercase text-slate-500 leading-none">{breathPhase}</div>
                <div className="text-sm font-extrabold text-chobee-navy-900 font-display">{breathSeconds}s</div>
              </div>
            </div>
          </div>

          {/* Quick Water Hydration Tracker */}
          {onAddWater && (
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-card flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-chobee-blue-500 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-chobee-navy-900">Hydration Tracker</div>
                  <div className="text-[11px] text-slate-500">{stats.waterGlassesToday} glasses logged today</div>
                </div>
              </div>
              <button
                onClick={onAddWater}
                className="px-3 py-1 rounded-xl bg-chobee-blue-50 hover:bg-chobee-blue-100 text-chobee-blue-600 text-xs font-semibold transition-colors active:scale-95"
              >
                + Drink Water
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Study Materials Library Section */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-chobee-navy-900 font-display">
              Recent Study Reviewers
            </h3>
            <p className="text-xs text-slate-500">
              Select a reviewer to start practice or open flashcards
            </p>
          </div>

          {/* Search Pill */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewers..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-chobee-pink-400 shadow-xs"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Reviewers Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudySets.map((set) => {
            const masteredCount = set.flashcards.filter((c) => c.state === 'mastered').length;
            const progressPct = set.flashcards.length > 0 
              ? Math.round((masteredCount / set.flashcards.length) * 100) 
              : 0;

            return (
              <div 
                key={set.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {set.category}
                    </span>
                    <button
                      onClick={() => onOpenShare(set)}
                      title="Share Reviewer"
                      className="p-1 rounded-lg text-slate-400 hover:text-chobee-pink-600 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-chobee-navy-900 group-hover:text-chobee-pink-600 transition-colors line-clamp-1 font-display">
                      {set.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {set.description || `${set.flashcards.length} flashcards ready to study`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-medium">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {set.flashcards.length} Cards
                    </span>
                    <span className="font-semibold text-chobee-navy-900">{progressPct}% Mastered</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-chobee-pink-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* 3 Actions */}
                <div className="grid grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onSelectSet(set, 'flashcards')}
                    className="py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-chobee-pink-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Cards</span>
                  </button>

                  <button
                    onClick={() => onSelectSet(set, 'quiz')}
                    className="py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-chobee-blue-600 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Quiz</span>
                  </button>

                  <button
                    onClick={() => onSelectSet(set, 'summary')}
                    className="py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span>Guide</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredStudySets.length === 0 && (
          <div className="bg-white rounded-2xl p-10 border border-slate-200/80 text-center space-y-2">
            <p className="text-xs font-semibold text-slate-600">No reviewers match your search.</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-chobee-pink-600 hover:underline"
            >
              Clear search filter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
