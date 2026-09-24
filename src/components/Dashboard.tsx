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
  Heart,
  Calendar as CalendarIcon,
  Wifi,
  Battery,
  Volume2,
  Disc,
  Search, 
  X, 
  Zap,
  Sparkles,
  BookOpen,
  Star,
  Flame,
  Trophy,
  BrainCircuit,
  PlusCircle,
  Users
} from 'lucide-react';
import { StudySet, UserStats } from '../types/study';
import { isCardDue } from '../services/spacedRepetition';
import { lofiPlayer, playHapticTap } from '../services/audioService';
import { BiomeTheme } from '../App';
import { ROMANTIC_DATA } from '../data/memories';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  studySets: StudySet[];
  stats: UserStats;
  onSelectSet: (set: StudySet, mode: 'flashcards' | 'quiz' | 'exam' | 'summary') => void;
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
  onOpenMonthsary,
  onNavigateToUsage,
}) => {
  const { user, dailyUsage } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // Interactive Breathing Widget State
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  // Live Clock & Calendar State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Vinyl Lofi Player State
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.25);

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

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
      clearInterval(clockInterval);
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

  // Due cards calculation
  const allDueCards = studySets.flatMap((s) => s.flashcards.filter((c) => isCardDue(c)));
  const totalDueCount = allDueCards.length;

  const totalCardsAcrossSets = studySets.reduce((acc, s) => acc + s.flashcards.length, 0);
  const accuracyPercentage = stats.totalQuestionsAnswered > 0
    ? Math.round((stats.correctAnswersTotal / stats.totalQuestionsAnswered) * 100)
    : 88;

  // Calendar calculations
  const currentMonthName = currentTime.toLocaleString('en-US', { month: 'long' });
  const currentYear = currentTime.getFullYear();
  const currentDay = currentTime.getDate();
  const currentWeekday = currentTime.toLocaleString('en-US', { weekday: 'short' });
  const daysInMonth = new Date(currentYear, currentTime.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentTime.getMonth(), 1).getDay();

  // Active / Last Studied Deck
  const activeDeck = studySets[0] || null;

  // Filter sets by search and tag
  const filteredStudySets = studySets.filter((s) => {
    const matchesSearch = !searchQuery.trim() || (
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!matchesSearch) return false;
    if (selectedTag === 'All') return true;
    if (selectedTag === 'Favorites') return Boolean(s.isFavorite);
    if (selectedTag === 'Shared') return Boolean(s.isPublic || s.author !== 'Mayor Cia');
    return s.category === selectedTag;
  });

  return (
    <div className="space-y-6 pb-28 sm:pb-24 max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-4">
      {/* ========================================================================= */}
      {/* 1. Translucent Search & Live Time Bar                                      */}
      {/* ========================================================================= */}
      <div className="ios-glass-pill !rounded-3xl sm:!rounded-full px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-3 text-xs font-bold text-chobee-navy-800">
        <div className="w-full md:w-auto flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-chobee-pink-600 font-display font-black tracking-wide">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-semibold text-[11px] sm:text-xs">
              {currentWeekday}, {currentMonthName} {currentDay}
            </span>
          </div>

          <div className="flex md:hidden items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/40 px-2 py-0.5 rounded-lg text-emerald-800 text-[10px] font-bold">
            <Battery className="w-3 h-3 fill-emerald-600" />
            <span>Ready ⚡</span>
          </div>
        </div>

        {/* Center: Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/90 shadow-inner text-chobee-navy-900 focus-within:bg-white focus-within:border-chobee-pink-300 transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviewers, topics, or terms..."
              className="w-full bg-transparent text-xs font-semibold placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Live indicator */}
        <div className="hidden md:flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-[11px] text-chobee-blue-600 font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            <span>Cloud Synced</span>
          </span>
          <div className="flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-400/40 px-2.5 py-1 rounded-lg text-emerald-800 text-[11px] font-bold">
            <Battery className="w-3.5 h-3.5 fill-emerald-600" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Welcome & Daily AI Token Progress HUD                                  */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-[26px] sm:rounded-[32px] p-5 sm:p-7 border border-white/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-fadeIn">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/90 text-chobee-pink-700 font-extrabold text-xs">
            <span>🧸 Welcome back, {user ? user.displayName : 'Student'} 👋</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-chobee-navy-950 font-display">
            What would you like to study today?
          </h1>
          <p className="text-xs text-slate-500 font-semibold">
            Review flashcards, challenge yourself with a mock exam, or generate new decks from your notes.
          </p>
        </div>

        {/* Daily Token Gauge */}
        <div className="w-full md:w-auto flex-1 max-w-sm bg-white/85 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-chobee-pink-500 fill-chobee-pink-500" />
              <span>Daily AI Study Credits</span>
            </span>
            <span className="font-mono text-chobee-navy-900">
              {user?.role === 'admin' ? 'Unlimited' : `${dailyUsage.remaining} / ${dailyUsage.allocated}`}
            </span>
          </div>

          {user?.role !== 'admin' && (
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, Math.round((dailyUsage.remaining / dailyUsage.allocated) * 100)))}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Resets in: <strong className="text-chobee-navy-900 font-mono">{dailyUsage.resetCountdown}</strong></span>
            {onNavigateToUsage && (
              <button
                onClick={onNavigateToUsage}
                className="text-chobee-pink-600 hover:underline font-extrabold"
              >
                Usage History &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Due for Review Spaced Repetition Alert Banner */}
      {totalDueCount > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-pink-300/80 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-chobee-pink-500 to-chobee-blue-500 text-white flex items-center justify-center font-bold shadow-xs flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-chobee-navy-900">
                Spaced Repetition: {totalDueCount} Cards Due for Review!
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600">
                Boost retention by going through today's memory review queue.
              </p>
            </div>
          </div>
          <button
            onClick={() => activeDeck && onSelectSet(activeDeck, 'flashcards')}
            className="w-full sm:w-auto justify-center flex items-center gap-2 px-4 py-2 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white text-xs font-bold shadow-soft-pink transition-all active:scale-95 whitespace-nowrap"
          >
            <span>Review Due Cards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. Continue Studying Hero Card & Study Stats Overview                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 cols): Prominent Continue Studying Hero Card */}
        {activeDeck ? (
          <div className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-6 border border-white/90 shadow-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-chobee-pink-700 border border-pink-200">
                  {activeDeck.category}
                </span>
                <span className="text-xs text-slate-400 font-semibold">• Continue Studying</span>
              </div>
              <button
                onClick={() => onOpenShare(activeDeck)}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-chobee-pink-600 border border-slate-200 transition-colors shadow-2xs"
                title="Share Study Set"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-chobee-navy-950 font-display">
                {activeDeck.title}
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-1 line-clamp-2">
                {activeDeck.description || `${activeDeck.flashcards.length} flashcards and ${activeDeck.quizQuestions.length} practice questions.`}
              </p>
            </div>

            {/* Progress stats */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Mastery Progress</span>
                <span className="text-chobee-navy-900 font-mono">
                  {Math.round(((activeDeck.flashcards.filter((c) => c.state === 'mastered').length) / Math.max(1, activeDeck.flashcards.length)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-chobee-pink-500 via-purple-500 to-chobee-blue-500"
                  style={{
                    width: `${Math.round(((activeDeck.flashcards.filter((c) => c.state === 'mastered').length) / Math.max(1, activeDeck.flashcards.length)) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* 4 Launch Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                onClick={() => onSelectSet(activeDeck, 'flashcards')}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-rose-500 text-white font-bold text-xs shadow-soft-pink hover:shadow-glow-dual active:scale-95 transition-all flex flex-col items-center gap-1 text-center"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Flashcards</span>
              </button>

              <button
                onClick={() => onSelectSet(activeDeck, 'quiz')}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-pink-50/60 border border-slate-200 text-chobee-navy-900 font-bold text-xs shadow-2xs active:scale-95 transition-all flex flex-col items-center gap-1 text-center"
              >
                <CheckCircle2 className="w-4 h-4 text-chobee-pink-500" />
                <span>Practice Quiz</span>
              </button>

              <button
                onClick={() => onSelectSet(activeDeck, 'exam')}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-blue-50/60 border border-slate-200 text-chobee-navy-900 font-bold text-xs shadow-2xs active:scale-95 transition-all flex flex-col items-center gap-1 text-center"
              >
                <Trophy className="w-4 h-4 text-chobee-blue-500" />
                <span>Mock Exam</span>
              </button>

              <button
                onClick={() => onSelectSet(activeDeck, 'summary')}
                className="py-2.5 px-3 rounded-xl bg-white hover:bg-purple-50/60 border border-slate-200 text-chobee-navy-900 font-bold text-xs shadow-2xs active:scale-95 transition-all flex flex-col items-center gap-1 text-center"
              >
                <FileText className="w-4 h-4 text-purple-500" />
                <span>Study Guide</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 glass-panel rounded-3xl p-8 border border-white/90 text-center space-y-3 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-2xl">
              📚
            </div>
            <h3 className="text-base font-bold text-chobee-navy-900 font-display">No study sets yet</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Create your first study set or upload lecture notes and slides to generate flashcards and quiz questions.
            </p>
            <button
              onClick={onOpenUpload}
              className="mt-2 px-4 py-2 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 text-white font-bold text-xs shadow-soft-pink active:scale-95 transition-all"
            >
              + Create First Study Set
            </button>
          </div>
        )}

        {/* Right (5 cols): Study Stats & Quick Launcher */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* Quick Metrics 2x2 Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel rounded-2xl p-3.5 border border-white/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Mastered Cards</span>
              <div className="text-xl sm:text-2xl font-black text-chobee-pink-600 font-display">{stats.totalMastered}</div>
              <span className="text-[10px] text-slate-500 font-semibold">{totalCardsAcrossSets} Total Cards</span>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 border border-white/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Quiz Accuracy</span>
              <div className="text-xl sm:text-2xl font-black text-chobee-blue-600 font-display">{accuracyPercentage}%</div>
              <span className="text-[10px] text-slate-500 font-semibold">{stats.quizzesCompleted} Completed</span>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 border border-white/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500 fill-orange-400" />
                <span>Study Streak</span>
              </span>
              <div className="text-xl sm:text-2xl font-black text-orange-600 font-display">{stats.studyStreak} Days</div>
              <span className="text-[10px] text-slate-500 font-semibold">Keep it up! 🔥</span>
            </div>

            <div className="glass-panel rounded-2xl p-3.5 border border-white/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Reviewers</span>
              <div className="text-xl sm:text-2xl font-black text-purple-600 font-display">{studySets.length}</div>
              <span className="text-[10px] text-slate-500 font-semibold">Available to study</span>
            </div>
          </div>

          {/* Quick Upload Action Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-pink-200/80 flex items-center justify-between gap-3 shadow-xs">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-chobee-navy-900 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500" />
                <span>AI Study Generator</span>
              </span>
              <p className="text-[11px] text-slate-600 font-medium">Turn lecture notes or PDFs into instant flashcards.</p>
            </div>
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-chobee-navy-900 font-bold text-xs border border-slate-200/90 shadow-2xs whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-chobee-pink-500" />
              <span>Import</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Study Sets Library Section (Filter, Search & Clean Cards)             */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-chobee-navy-950 font-display">
              My Study Sets
            </h2>
            <span className="text-xs font-bold text-slate-400">
              ({filteredStudySets.length})
            </span>
          </div>

          {/* Filter Tag Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Tourism', 'Accounting', 'Events', 'Favorites', 'Shared'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedTag === tag
                    ? 'bg-chobee-navy-900 text-white shadow-xs'
                    : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/70'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Study Sets Grid */}
        {filteredStudySets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStudySets.map((set) => {
              const masteredCount = set.flashcards.filter((c) => c.state === 'mastered').length;
              const progressPct = set.flashcards.length > 0 
                ? Math.round((masteredCount / set.flashcards.length) * 100) 
                : 0;

              return (
                <div
                  key={set.id}
                  className="glass-panel rounded-2xl p-5 border border-slate-200/80 hover:border-pink-300 shadow-xs hover:shadow-card transition-all flex flex-col justify-between group space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pink-100 text-chobee-pink-700 border border-pink-200">
                        {set.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {set.isPublic && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            <span>Shared</span>
                          </span>
                        )}
                        <button
                          onClick={() => onOpenShare(set)}
                          className="p-1 rounded-lg text-slate-400 hover:text-chobee-pink-600 transition-colors"
                          title="Share"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-black text-chobee-navy-900 font-display group-hover:text-chobee-pink-600 transition-colors">
                        {set.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-0.5">
                        {set.description || `${set.flashcards.length} flashcards ready to study.`}
                      </p>
                    </div>

                    {/* Meta stats */}
                    <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-chobee-pink-500" />
                        <span>{set.flashcards.length} Cards</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-chobee-blue-500" />
                        <span>{set.quizQuestions.length} Questions</span>
                      </span>
                    </div>

                    {/* Mastery Bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span>Mastery</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-pink-400 to-blue-400"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onSelectSet(set, 'flashcards')}
                      className="py-2 rounded-xl bg-pink-50/80 hover:bg-pink-100 text-chobee-pink-700 font-bold text-xs text-center transition-colors active:scale-95"
                    >
                      Cards
                    </button>
                    <button
                      onClick={() => onSelectSet(set, 'quiz')}
                      className="py-2 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-chobee-blue-700 font-bold text-xs text-center transition-colors active:scale-95"
                    >
                      Quiz
                    </button>
                    <button
                      onClick={() => onSelectSet(set, 'exam')}
                      className="py-2 rounded-xl bg-rose-50/80 hover:bg-rose-100 text-rose-700 font-bold text-xs text-center transition-colors active:scale-95"
                    >
                      Exam
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 glass-panel rounded-3xl border border-white/80 space-y-2">
            <span className="text-3xl">🔍</span>
            <h3 className="text-sm font-bold text-chobee-navy-900">No reviewers match your search</h3>
            <p className="text-xs text-slate-500">Try searching for a different keyword or select "All" tags.</p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. Study Ambience & Wellness Companion Row                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* WIDGET 1: Mini Vinyl Turntable Study Player */}
        <div className="glass-panel rounded-2xl p-4 border border-white/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-chobee-pink-600 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-chobee-pink-500" />
              <span>Study Ambience</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/70 text-slate-600 border border-slate-200/80">
              {isMusicPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div 
              className={`w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-700 shadow-md flex items-center justify-center flex-shrink-0 ${
                isMusicPlaying ? 'animate-spin-slow' : ''
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-pink-400 border border-white flex items-center justify-center text-[10px]">
                🎵
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-xs font-black text-chobee-navy-900 truncate">Cozy Study Chords</div>
              <div className="text-[11px] text-chobee-pink-600 font-semibold truncate">Lofi Focus Melody</div>
              <div className="text-[10px] text-slate-400 font-medium">Binaural study frequencies</div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
            <button
              onClick={toggleMusic}
              className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                isMusicPlaying
                  ? 'bg-chobee-pink-500 text-white shadow-soft-pink'
                  : 'bg-slate-100 text-chobee-navy-800 hover:bg-slate-200'
              }`}
            >
              {isMusicPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isMusicPlaying ? 'Pause' : 'Play Music'}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl">
              <Volume2 className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={handleVolumeChange}
                className="w-12 h-1 accent-chobee-pink-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* WIDGET 2: Mindful Breathing Guide */}
        <div className="glass-panel rounded-2xl p-4 border border-white/80 shadow-xs flex flex-col items-center justify-between text-center space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-chobee-blue-600 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-chobee-blue-500" />
            <span>Mindful Reset</span>
          </div>

          <div className="relative my-1 flex items-center justify-center w-16 h-16">
            <div 
              className={`absolute w-14 h-14 rounded-full transition-all duration-1000 ${
                breathPhase === 'Inhale'
                  ? 'bg-gradient-to-tr from-pink-300 to-blue-300 scale-125 opacity-70'
                  : breathPhase === 'Hold'
                  ? 'bg-gradient-to-tr from-purple-300 to-pink-300 scale-125 opacity-90'
                  : 'bg-gradient-to-tr from-blue-200 to-pink-200 scale-95 opacity-50'
              }`}
            />
            <div className="relative z-10 w-12 h-12 rounded-full bg-white shadow-xs flex flex-col items-center justify-center">
              <span className="text-[8px] font-extrabold uppercase text-slate-500">{breathPhase}</span>
              <span className="text-xs font-black text-chobee-blue-600">{breathSeconds}s</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 font-medium">
            Take a breath, reset your mind, and study with clarity.
          </p>
        </div>

        {/* WIDGET 3: Subtle Companion & Encouragement */}
        <div className="glass-panel rounded-2xl p-4 border border-white/80 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Study Notes & Care</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">Class Rep #14 🌸</span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            "Keep up your great study momentum today! Remember to hydrate and take breaks between study sets."
          </p>

          <button
            onClick={onOpenMonthsary}
            className="w-full py-2 px-3 rounded-xl bg-white hover:bg-pink-50/70 text-chobee-pink-600 font-bold text-xs border border-pink-200/80 shadow-2xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
            <span>Open Encouragement Note 🎀</span>
          </button>
        </div>
      </div>
    </div>
  );
};
