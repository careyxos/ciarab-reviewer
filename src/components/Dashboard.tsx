import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  BrainCircuit, 
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
  Smartphone,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Search,
  X,
  Zap
} from 'lucide-react';
import { StudySet, UserStats } from '../types/study';
import { isCardDue } from '../services/spacedRepetition';
import { lofiPlayer, playHapticTap } from '../services/audioService';
import { BIOME_THEMES, BiomeTheme } from '../App';
import { ROMANTIC_DATA } from '../data/memories';
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
  onOpenMonthsary,
  onNavigateToUsage,
  currentBiome = 'sakura',
  onSelectBiome,
}) => {
  const { user, dailyUsage } = useAuth();

  // Interactive Photo Gallery Carousel State
  const photoGallery = ROMANTIC_DATA.polaroids.filter((p) => Boolean(p.imageUrl));
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isPhotoPaused, setIsPhotoPaused] = useState(false);
  const [isBiomeMenuOpen, setIsBiomeMenuOpen] = useState(false);

  // Auto rotate photo gallery every 7 seconds if not paused
  useEffect(() => {
    if (isPhotoPaused || photoGallery.length <= 1) return;
    const interval = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % photoGallery.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [isPhotoPaused, photoGallery.length]);

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playHapticTap();
    setPhotoIndex((prev) => (prev + 1) % photoGallery.length);
  };

  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playHapticTap();
    setPhotoIndex((prev) => (prev - 1 + photoGallery.length) % photoGallery.length);
  };

  const currentPhoto = photoGallery[photoIndex] || photoGallery[0];

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

  // Compute total due cards across all sets
  const allDueCards = studySets.flatMap((s) => s.flashcards.filter((c) => isCardDue(c)));
  const totalDueCount = allDueCards.length;

  const totalCardsAcrossSets = studySets.reduce((acc, s) => acc + s.flashcards.length, 0);
  const accuracyPercentage = stats.totalQuestionsAnswered > 0
    ? Math.round((stats.correctAnswersTotal / stats.totalQuestionsAnswered) * 100)
    : 88;

  // Calendar calculations for aesthetic mini calendar widget
  const currentMonthName = currentTime.toLocaleString('en-US', { month: 'long' });
  const currentYear = currentTime.getFullYear();
  const currentDay = currentTime.getDate();
  const currentWeekday = currentTime.toLocaleString('en-US', { weekday: 'short' });

  // Generate days in current month
  const daysInMonth = new Date(currentYear, currentTime.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentTime.getMonth(), 1).getDay();

  // Search Query for iOS App Library Reviewers
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStudySets = studySets.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4">
      {/* ========================================================================= */}
      {/* 1. iOS App Library Translucent Glass Search & Control Center Capsule Pill  */}
      {/* ========================================================================= */}
      <div className="ios-glass-pill px-4 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-bold text-chobee-navy-800">
        <div className="flex items-center gap-2.5">
          <span className="text-chobee-pink-600 font-display font-black tracking-wide">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-700 font-semibold">{currentWeekday}, {currentMonthName} {currentDay}</span>
        </div>

        {/* Center: Authentic iOS "App Library" Search Pill */}
        <div className="relative flex-1 max-w-sm w-full">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/45 backdrop-blur-md border border-white/80 shadow-inner text-chobee-navy-900 focus-within:bg-white/70 focus-within:border-white transition-all">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="App Library • Search reviewers..."
              className="w-full bg-transparent text-xs font-semibold placeholder:text-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Status & Battery */}
        <div className="flex items-center gap-2.5">
          <span className="hidden md:flex items-center gap-1 text-[11px] text-chobee-blue-600 font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            <span>Chobee 🩵</span>
          </span>
          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-1 rounded-lg text-emerald-800 text-[11px] font-bold backdrop-blur-xs">
            <Battery className="w-3.5 h-3.5 fill-emerald-600" />
            <span>100% ⚡</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Personalized User Dashboard Banner & Daily Token HUD                    */}
      {/* ========================================================================= */}
      <div className="glass-panel rounded-[32px] p-5 sm:p-7 border-2 border-white/90 shadow-glow-dual flex flex-col md:flex-row items-start md:items-center justify-between gap-6 animate-fadeIn">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100/90 text-chobee-pink-700 font-extrabold text-xs">
            <span>🧸 Welcome back, {user ? user.displayName : 'Mayor Cia'} 👋</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-chobee-navy-950 font-display">
            Ready for today's review session?
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Track your daily tokens, maintain your review streak, and master every concept.
          </p>
        </div>

        {/* Daily Token Gauge */}
        <div className="w-full md:w-auto flex-1 max-w-md bg-white/80 border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-chobee-pink-500 fill-chobee-pink-500" />
              <span>Daily AI Tokens</span>
            </span>
            <span className="font-mono text-chobee-navy-900">
              {user?.role === 'admin' ? 'Unlimited' : `${dailyUsage.remaining} / ${dailyUsage.allocated}`}
            </span>
          </div>

          {user?.role !== 'admin' && (
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
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

      {/* ========================================================================= */}
      {/* 3. Top iOS Split Widget Row: Aesthetic Photo Frame & MayorOS Hub          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Col (5 cols): Interactive Aesthetic Photo & Memory Gallery Widget */}
        <div 
          onMouseEnter={() => setIsPhotoPaused(true)}
          onMouseLeave={() => setIsPhotoPaused(false)}
          className="lg:col-span-5 ios-glass-container p-4 sm:p-5 relative overflow-hidden group flex flex-col justify-between"
        >
          <div className="relative w-full aspect-square max-h-72 sm:max-h-80 rounded-[28px] overflow-hidden shadow-inner border-2 border-white/80 group/frame">
            <img 
              src={currentPhoto.imageUrl} 
              alt={currentPhoto.title} 
              className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105"
            />
            {/* Scalloped / vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

            {/* Cute Tag Badge (Top Left) */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-white/80 text-xs font-bold text-chobee-pink-600 shadow-soft-pink">
              <span>🎀</span>
              <span>{currentPhoto.tag}</span>
            </div>

            {/* Navigation Chevrons */}
            <div className="absolute inset-y-0 inset-x-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button
                onClick={handlePrevPhoto}
                className="pointer-events-auto w-8 h-8 rounded-full bg-white/80 hover:bg-white text-chobee-navy-900 flex items-center justify-center shadow-md active:scale-90 transition-transform backdrop-blur-xs"
                title="Previous Photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextPhoto}
                className="pointer-events-auto w-8 h-8 rounded-full bg-white/80 hover:bg-white text-chobee-navy-900 flex items-center justify-center shadow-md active:scale-90 transition-transform backdrop-blur-xs"
                title="Next Photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Caption Overlay */}
            <div className="absolute bottom-3 inset-x-3 flex flex-col gap-0.5 p-2.5 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-chobee-navy-900 truncate">
                  {currentPhoto.title}
                </span>
                <span className="text-[10px] text-chobee-pink-600 font-bold">
                  {photoIndex + 1} / {photoGallery.length}
                </span>
              </div>
              <p className="text-[11px] text-chobee-navy-700 font-medium truncate">
                {currentPhoto.caption}
              </p>
            </div>
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center justify-center gap-1.5 pt-3">
            {photoGallery.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => {
                  playHapticTap();
                  setPhotoIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === photoIndex
                    ? 'w-6 bg-chobee-pink-500 shadow-2xs'
                    : 'w-2 bg-white/60 hover:bg-white'
                }`}
                title={p.title}
              />
            ))}
          </div>
        </div>

        {/* Right Col (7 cols): MayorOS System & Study Hub Widget (Control Center) */}
        <div className="lg:col-span-7 ios-glass-container p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/40 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-chobee-pink-400/90 via-pink-300/80 to-chobee-blue-400/90 p-0.5 shadow-soft-pink flex items-center justify-center">
                <div className="w-full h-full bg-white/90 backdrop-blur-md rounded-[14px] flex items-center justify-center text-xl">
                  🌸
                </div>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-chobee-navy-900 font-display">
                  Mayor Cia's Control Center
                </h2>
                <p className="text-xs text-chobee-pink-600 font-semibold">
                  MayorOS 26.0 • Liquid Glass AI Study Suite
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/50 backdrop-blur-md border border-white/70 text-chobee-pink-600 text-xs font-bold">
              <span>🎀 Class Rep #14 🌸</span>
            </div>
          </div>

          {/* iOS System Info Stat Blocks (2x2 Glass Tiles) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="ios-glass-tile p-3 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Storage</div>
              <div className="text-lg font-black text-chobee-pink-600 font-display">256 GB</div>
              <div className="text-[10px] text-chobee-pink-600 font-semibold">{stats.totalMastered} Mastered</div>
            </div>

            <div className="ios-glass-tile p-3 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Accuracy</div>
              <div className="text-lg font-black text-chobee-blue-600 font-display">{accuracyPercentage}%</div>
              <div className="text-[10px] text-chobee-blue-600 font-semibold">{stats.quizzesCompleted} Tests</div>
            </div>

            <div className="ios-glass-tile p-3 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Reviewers</div>
              <div className="text-lg font-black text-purple-600 font-display">{studySets.length}</div>
              <div className="text-[10px] text-purple-600 font-semibold">{totalCardsAcrossSets} Cards</div>
            </div>

            <div className="ios-glass-tile p-3 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status</div>
              <div className="text-lg font-black text-emerald-600 font-display">Active</div>
              <div className="text-[10px] text-emerald-600 font-semibold">Ready to Ace 🌸</div>
            </div>
          </div>

          {/* Quick Action Launcher Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onOpenUpload}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-chobee-pink-500/90 to-chobee-blue-500/90 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white font-extrabold text-xs sm:text-sm shadow-soft-pink active:scale-95 transition-all border border-white/50 backdrop-blur-md"
            >
              <Upload className="w-4 h-4" />
              <span>+ Upload Reviewer (PDF / Notes)</span>
            </button>
            <button
              onClick={() => studySets[0] && onSelectSet(studySets[0], 'flashcards')}
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-white/55 hover:bg-white/75 text-chobee-navy-900 font-bold text-xs sm:text-sm border border-white/80 shadow-xs active:scale-95 transition-all backdrop-blur-md"
            >
              <Play className="w-4 h-4 text-chobee-pink-500 fill-chobee-pink-400" />
              <span>Start Quick Review</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. iOS Middle Row: Vinyl Record Player, Live Calendar & Breathing Guide   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* WIDGET 1: Mini Vinyl Turntable / Melody Player Widget */}
        <div className="ios-glass-container p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-chobee-pink-600 flex items-center gap-1.5">
              <Disc className="w-3.5 h-3.5 text-chobee-pink-500" />
              <span>Study Melody Widget</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 backdrop-blur-md text-chobee-pink-600 border border-white/70">
              {isMusicPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>

          {/* Vinyl Record Visual */}
          <div className="my-3 flex items-center justify-center gap-3 sm:gap-4">
            <div className="relative flex items-center justify-center">
              {/* Mini Album Cover Sleeve */}
              <div className="w-16 h-20 rounded-xl overflow-hidden shadow-md border border-white/70 -rotate-6 hidden sm:block mr-2 relative z-0 flex-shrink-0">
                <img 
                  src="/assets/aesthetic_lace_lilies.jpg" 
                  alt="FLOWER Album Art" 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Vinyl Disc Body */}
              <div 
                className={`w-24 h-24 rounded-full bg-slate-900 border-4 border-slate-800 shadow-lg flex items-center justify-center relative z-10 flex-shrink-0 ${
                  isMusicPlaying ? 'animate-spin-slow' : 'paused-spin'
                }`}
              >
                {/* Concentric Grooves */}
                <div className="w-20 h-20 rounded-full border border-slate-700/60 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border border-slate-700/40 flex items-center justify-center">
                    {/* Pink Center Label */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-400 to-pink-300 border-2 border-white flex items-center justify-center text-xs shadow-inner">
                      🎀
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1 max-w-[130px] z-10">
              <div className="text-xs font-black text-chobee-navy-900 truncate">
                花 (FLOWER)
              </div>
              <div className="text-[11px] font-semibold text-chobee-pink-600 truncate">
                Chobee Lofi Melody
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                Relaxing study chords
              </div>
            </div>
          </div>

          {/* Music Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-white/40 gap-2">
            <button
              onClick={toggleMusic}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                isMusicPlaying
                  ? 'bg-chobee-pink-500 text-white shadow-soft-pink'
                  : 'bg-white/50 text-chobee-pink-600 hover:bg-white/70 border border-white/70'
              }`}
            >
              {isMusicPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isMusicPlaying ? 'Pause Melody' : 'Play Lofi'}</span>
            </button>

            <div className="flex items-center gap-1.5 bg-white/50 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/70">
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={handleVolumeChange}
                className="w-14 h-1 accent-chobee-pink-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* WIDGET 2: Live Calendar & Clock Widget */}
        <div className="ios-glass-container p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-chobee-blue-600 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-chobee-blue-500" />
              <span>Calendar & Date</span>
            </span>
            <span className="text-xs font-bold text-chobee-navy-800 font-display">
              {currentMonthName} {currentYear}
            </span>
          </div>

          {/* Mini Calendar Grid */}
          <div className="my-2">
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 mb-1">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 text-center text-xs gap-y-1 font-medium">
              {/* Empty leading days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const isToday = dayNum === currentDay;
                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`py-1 rounded-lg text-xs font-semibold ${
                      isToday
                        ? 'bg-chobee-pink-500 text-white font-extrabold shadow-soft-pink'
                        : 'text-chobee-navy-800 hover:bg-white/40'
                    }`}
                  >
                    {dayNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Today Info */}
          <div className="text-center pt-2 border-t border-white/40 text-[11px] text-chobee-pink-600 font-semibold flex items-center justify-center gap-1.5">
            <span>✨</span>
            <span>No exam stress today • Focus & smile!</span>
          </div>
        </div>

        {/* WIDGET 3: Peaceful Mind Breathing Guide Widget */}
        <div className="ios-glass-container p-5 flex flex-col items-center justify-between text-center relative overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-wider text-chobee-blue-600 flex items-center gap-1.5">
            <Wind className="w-3.5 h-3.5 text-chobee-blue-500" />
            <span>Peaceful Mind Guide</span>
          </div>

          {/* Animated Breathing Circle */}
          <div className="relative my-3 flex items-center justify-center w-28 h-28">
            <div 
              className={`absolute w-24 h-24 rounded-full transition-all duration-1000 ${
                breathPhase === 'Inhale'
                  ? 'bg-gradient-to-tr from-pink-300/80 to-blue-300/80 scale-125 opacity-70 blur-xs'
                  : breathPhase === 'Hold'
                  ? 'bg-gradient-to-tr from-purple-300/80 to-pink-300/80 scale-125 opacity-90'
                  : 'bg-gradient-to-tr from-blue-200/80 to-pink-200/80 scale-95 opacity-50'
              }`}
            />
            <div className="relative z-10 w-20 h-20 rounded-full bg-white/80 backdrop-blur-md shadow-soft-blue flex flex-col items-center justify-center border border-white/90">
              <span className="text-[10px] font-extrabold text-chobee-navy-800 font-display uppercase tracking-wider">
                {breathPhase}
              </span>
              <span className="text-base font-black text-chobee-blue-600 font-display">
                {breathSeconds}s
              </span>
            </div>
          </div>

          <p className="text-xs text-chobee-navy-800/80 max-w-xs font-medium">
            {breathPhase === 'Inhale' && 'Breathe in calmness and confidence...'}
            {breathPhase === 'Hold' && 'Hold gently and know you are capable...'}
            {breathPhase === 'Exhale' && 'Release all tension and stress... 🩵'}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Chobee's Love Note Banner with Vintage Lace & Lilies                   */}
      {/* ========================================================================= */}
      <div className="ios-glass-container p-5 sm:p-6 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Soft Vintage Lace Lilies Backdrop Texture */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 pointer-events-none mix-blend-multiply"
          style={{ backgroundImage: `url('/assets/aesthetic_lace_lilies.jpg')` }}
        />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-md shadow-soft-pink flex items-center justify-center text-2xl border border-white/80 flex-shrink-0">
            🧸
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-chobee-navy-900 font-display">
                Chobee's Daily Care Reminder for Mayor Cia
              </h3>
              <span className="text-xs">🌸</span>
            </div>
            <p className="text-xs text-chobee-navy-800/85 leading-relaxed max-w-2xl font-medium">
              "Take a deep breath (<span className="text-chobee-pink-600 font-bold">Inhale... Exhale... 🧸🩵</span>) and don't skip your meals today! Kahit busy sa review at class rep duties, your health and peace of mind come first. Super proud si Baby Bear sa sipag mo mag-aral palagi!"
            </p>
          </div>
        </div>

        <button
          onClick={onOpenMonthsary}
          className="relative z-10 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/70 hover:bg-white text-chobee-pink-600 font-extrabold text-xs border border-white/80 shadow-soft-pink active:scale-95 transition-all whitespace-nowrap backdrop-blur-md"
        >
          <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
          <span>Open Secret Note 🎀</span>
        </button>
      </div>

      {/* Due for Review Spaced Repetition Alert Banner */}
      {totalDueCount > 0 && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-pink-300/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-chobee-pink-500 to-chobee-blue-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-chobee-navy-900">
                Spaced Repetition: {totalDueCount} Cards Due for Review Today!
              </h4>
              <p className="text-xs text-chobee-navy-700/70">
                Keep your memory sharp by completing today's quick review queue.
              </p>
            </div>
          </div>
          <button
            onClick={() => studySets[0] && onSelectSet(studySets[0], 'flashcards')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95 whitespace-nowrap"
          >
            <span>Review {totalDueCount} Due Cards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. Study Reviewers Collection (iOS App Library Squircle Folders)          */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-chobee-pink-600 font-extrabold border border-pink-200 shadow-xs flex items-center gap-1.5">
              <span>🎀</span>
              <span>{filteredStudySets.length} Study Reviewers Ready</span>
            </span>
            <span className="hidden sm:inline text-xs text-slate-600 font-semibold">Tap any reviewer app tile to begin study</span>
          </div>

          <button
            onClick={onOpenUpload}
            className="text-xs font-extrabold text-chobee-pink-600 hover:text-chobee-pink-700 flex items-center gap-1.5 transition-all bg-white/90 hover:bg-white backdrop-blur-md px-3.5 py-1.5 rounded-full border border-pink-200 shadow-xs active:scale-95"
          >
            <span>+ Add Reviewer</span>
          </button>
        </div>

        {/* Study Sets Grid - Authentic iOS App Library Squircles (High Contrast & Tactile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredStudySets.map((set) => {
            const masteredCount = set.flashcards.filter((c) => c.state === 'mastered').length;
            const progressPct = set.flashcards.length > 0 
              ? Math.round((masteredCount / set.flashcards.length) * 100) 
              : 0;

            return (
              <div key={set.id} className="flex flex-col items-center group">
                {/* iOS App Library Translucent Squircle Folder */}
                <div className="w-full aspect-[4/3] sm:aspect-square bg-white/50 hover:bg-white/65 backdrop-blur-2xl p-3.5 sm:p-4 rounded-[34px] border-2 border-white/80 shadow-md hover:shadow-xl hover:border-pink-200/90 transition-all duration-300 flex flex-col justify-between">
                  
                  {/* Folder Header */}
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-700 bg-pink-100/90 px-2.5 py-0.5 rounded-full border border-pink-200/80 shadow-2xs">
                      {set.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenShare(set);
                      }}
                      title="Share Reviewer"
                      className="p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-600 hover:text-chobee-pink-600 border border-slate-200/80 shadow-2xs transition-all active:scale-90"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 2x2 App Tiles Grid */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 flex-1">
                    {/* Tile 1: Flashcards */}
                    <button
                      onClick={() => onSelectSet(set, 'flashcards')}
                      className="rounded-[20px] bg-white/85 hover:bg-white border border-white/90 shadow-xs p-2 sm:p-2.5 flex flex-col items-center justify-center text-center gap-1 group/tile relative overflow-hidden transition-all active:scale-95"
                      title="Open Flashcards"
                    >
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-pink-400 to-rose-400 flex items-center justify-center text-white shadow-xs group-hover/tile:scale-110 transition-transform">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-chobee-navy-950 leading-tight">Flashcards</span>
                      <span className="text-[10px] font-bold text-chobee-pink-600">{set.flashcards.length} Cards</span>
                    </button>

                    {/* Tile 2: Quiz */}
                    <button
                      onClick={() => onSelectSet(set, 'quiz')}
                      className="rounded-[20px] bg-white/85 hover:bg-white border border-white/90 shadow-xs p-2 sm:p-2.5 flex flex-col items-center justify-center text-center gap-1 group/tile relative overflow-hidden transition-all active:scale-95"
                      title="Take Quiz"
                    >
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-400 to-indigo-400 flex items-center justify-center text-white shadow-xs group-hover/tile:scale-110 transition-transform">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-chobee-navy-950 leading-tight">Quiz Exam</span>
                      <span className="text-[10px] font-bold text-chobee-blue-600">{set.quizQuestions.length} Qs</span>
                    </button>

                    {/* Tile 3: Summary / Guide */}
                    <button
                      onClick={() => onSelectSet(set, 'summary')}
                      className="rounded-[20px] bg-white/85 hover:bg-white border border-white/90 shadow-xs p-2 sm:p-2.5 flex flex-col items-center justify-center text-center gap-1 group/tile relative overflow-hidden transition-all active:scale-95"
                      title="Read Study Guide"
                    >
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-purple-400 to-fuchsia-400 flex items-center justify-center text-white shadow-xs group-hover/tile:scale-110 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-black text-chobee-navy-950 leading-tight">Mind Guide</span>
                      <span className="text-[10px] font-bold text-purple-600">{set.fileType || 'Notes'}</span>
                    </button>

                    {/* Tile 4: Quick Review & Mastery Ace */}
                    <button
                      onClick={() => onSelectSet(set, 'flashcards')}
                      className="rounded-[20px] bg-white/85 hover:bg-white border border-white/90 shadow-xs p-2 sm:p-2.5 flex flex-col items-center justify-center text-center gap-1 group/tile relative overflow-hidden transition-all active:scale-95"
                      title="Quick Ace Review"
                    >
                      <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-400 flex items-center justify-center text-white shadow-xs group-hover/tile:scale-110 transition-transform">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                      <span className="text-xs font-black text-chobee-navy-950 leading-tight">Quick Ace</span>
                      <span className="text-[10px] font-bold text-emerald-600">{progressPct}% Done</span>
                    </button>
                  </div>

                  {/* Progress Bar inside folder */}
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden border border-white/60">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* iOS App Library Centered Folder Name Underneath (High Contrast Pill) */}
                <div className="mt-3 text-center px-3.5 py-2 rounded-2xl bg-white/80 hover:bg-white/95 backdrop-blur-md border border-white/90 shadow-xs transition-all w-full max-w-[280px]">
                  <h3 className="text-sm sm:text-base font-black text-chobee-navy-950 truncate tracking-tight">
                    {set.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">
                    {set.description || `${set.flashcards.length} flashcards ready to study`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
