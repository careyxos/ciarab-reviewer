import React, { useState, useEffect, useRef } from 'react';
import { fireLightCelebration } from './services/fxService';
import { 
  Heart, 
  Sparkles, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  Award, 
  LayoutDashboard, 
  BrainCircuit, 
  Library, 
  FileText,
  Move
} from 'lucide-react';
import { StudySet, UserStats, Achievement } from './types/study';
import { 
  getStoredStudySets, 
  saveStoredStudySets, 
  getStoredStats, 
  saveStoredStats, 
  getStoredAchievements, 
  saveStoredAchievements,
  parseSharedSetFromUrl
} from './services/storageService';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { FlashcardView } from './components/FlashcardView';
import { QuizView } from './components/QuizView';
import { SummaryView } from './components/SummaryView';
import { LibraryView } from './components/LibraryView';
import { UploadModal } from './components/UploadModal';
import { ShareModal } from './components/ShareModal';
import { SecretMonthsaryModal } from './components/SecretMonthsaryModal';
import { ROMANTIC_DATA } from './data/memories';
import { playHapticTap } from './services/audioService';

export type BiomeTheme = 'pastel' | 'ios' | 'sakura' | 'ribbon' | 'sanrio' | 'camera' | 'lilies';

export const BIOME_THEMES: Record<BiomeTheme, { id: BiomeTheme; name: string; icon: string; bgImage?: string; subtitle: string }> = {
  pastel: {
    id: 'pastel',
    name: 'Aesthetic Pink & Blue',
    icon: '🌸🩵',
    subtitle: 'Classic dreamy pink & blue ambient glow'
  },
  ios: {
    id: 'ios',
    name: 'iOS App Library Glass',
    icon: '🫧',
    bgImage: '/assets/aesthetic_ios_glass.jpg',
    subtitle: 'Translucent liquid frosted glass'
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Canopy',
    icon: '🌸',
    bgImage: '/assets/aesthetic_sakura_bloom.jpg',
    subtitle: 'Blooming cherry blossom spring'
  },
  ribbon: {
    id: 'ribbon',
    name: 'Silk Ribbon & Pearls',
    icon: '🎀',
    bgImage: '/assets/aesthetic_ribbon_pearls.jpg',
    subtitle: 'Coquette pearls & vintage notes'
  },
  sanrio: {
    id: 'sanrio',
    name: 'Sanrio Sweethearts',
    icon: '🐰',
    bgImage: '/assets/aesthetic_sanrio_duo.jpg',
    subtitle: 'Pastel My Melody & Bunny'
  },
  camera: {
    id: 'camera',
    name: 'Pink Cybershot',
    icon: '📸',
    bgImage: '/assets/aesthetic_vintage_camera.jpg',
    subtitle: 'Pretty soul, pretty girl'
  },
  lilies: {
    id: 'lilies',
    name: 'Lace & Lilies',
    icon: '🕊️',
    bgImage: '/assets/aesthetic_lace_lilies.jpg',
    subtitle: 'Delicate vintage floral lace'
  }
};

export function App() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [selectedSet, setSelectedSet] = useState<StudySet | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flashcards' | 'quiz' | 'summary' | 'library'>('dashboard');
  const [stats, setStats] = useState<UserStats>(getStoredStats());

  // Aesthetic Biome Wallpaper State & Effects
  const [currentBiome, setCurrentBiome] = useState<BiomeTheme>(() => {
    return (localStorage.getItem('chobee_biome_theme') as BiomeTheme) || 'pastel';
  });
  const [isBiomeTransitioning, setIsBiomeTransitioning] = useState(false);
  const [biomeNotification, setBiomeNotification] = useState<{ name: string; icon: string } | null>(null);

  const handleSelectBiome = (theme: BiomeTheme) => {
    if (soundEnabled) playHapticTap();
    setIsBiomeTransitioning(true);
    setCurrentBiome(theme);
    localStorage.setItem('chobee_biome_theme', theme);
    fireLightCelebration(0.5, 0.4);
    setBiomeNotification({ name: BIOME_THEMES[theme].name, icon: BIOME_THEMES[theme].icon });
    setTimeout(() => {
      setIsBiomeTransitioning(false);
    }, 700);
    setTimeout(() => {
      setBiomeNotification(null);
    }, 3000);
  };

  // Modal States
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shareModalSet, setShareModalSet] = useState<StudySet | null>(null);
  const [isMonthsaryOpen, setIsMonthsaryOpen] = useState(false);

  // Sound settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Encouraging toast notification
  const [activeToast, setActiveToast] = useState<string | null>(null);

  // DRAGGABLE FLOATING BALL STATE (100% Responsive on Touch & Mouse)
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const startCoordRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    moved: false,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    startCoordRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      moved: false,
    };
    isDraggingRef.current = true;
    try {
      el.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startCoordRef.current.startX;
    const dy = e.clientY - startCoordRef.current.startY;

    // Only consider as drag if movement exceeds 10px (prevents accidental drag on tap)
    if (Math.hypot(dx, dy) > 10) {
      startCoordRef.current.moved = true;
      const maxX = window.innerWidth - 65;
      const maxY = window.innerHeight - 65;
      const nextX = Math.min(maxX, Math.max(12, startCoordRef.current.origX + dx));
      const nextY = Math.min(maxY, Math.max(12, startCoordRef.current.origY + dy));
      setCustomPos({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }

    // If it was just a tap without significant dragging, open modal immediately!
    if (!startCoordRef.current.moved) {
      if (soundEnabled) playHapticTap();
      setIsMonthsaryOpen(true);
    }
  };

  // Initialize data on mount
  useEffect(() => {
    const sharedSet = parseSharedSetFromUrl();
    const stored = getStoredStudySets();

    if (sharedSet) {
      const merged = [sharedSet, ...stored.filter((s) => s.id !== sharedSet.id)];
      setStudySets(merged);
      setSelectedSet(sharedSet);
      setActiveTab('flashcards');
      setActiveToast(`Opened shared reviewer from Mayor Cia: "${sharedSet.title}"! ✨`);
    } else {
      setStudySets(stored);
      setSelectedSet(stored[0] || null);
    }
  }, []);

  // Periodic random encouraging love notes from Baby Bear
  useEffect(() => {
    const quotes = ROMANTIC_DATA.secretQuotes;
    const interval = setInterval(() => {
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setActiveToast(randomQuote);
      setTimeout(() => setActiveToast(null), 6000);
    }, 180000);

    return () => clearInterval(interval);
  }, []);

  const handleStudySetCreated = (newSet: StudySet) => {
    const updated = [newSet, ...studySets];
    setStudySets(updated);
    saveStoredStudySets(updated);
    setSelectedSet(newSet);
    setActiveTab('flashcards');

    updateStats((prev) => ({
      ...prev,
      xp: prev.xp + 50,
    }));
    setActiveToast(`New reviewer "${newSet.title}" ready for Mayor Cia! 🌸`);
  };

  const handleUpdateSet = (updatedSet: StudySet) => {
    const updated = studySets.map((s) => (s.id === updatedSet.id ? updatedSet : s));
    setStudySets(updated);
    saveStoredStudySets(updated);
    setSelectedSet(updatedSet);
  };

  const handleDeleteSet = (setId: string) => {
    const updated = studySets.filter((s) => s.id !== setId);
    setStudySets(updated);
    saveStoredStudySets(updated);
    if (selectedSet?.id === setId) {
      setSelectedSet(updated[0] || null);
      setActiveTab('dashboard');
    }
  };

  const handleToggleFavorite = (setId: string) => {
    const updated = studySets.map((s) =>
      s.id === setId ? { ...s, isFavorite: !s.isFavorite } : s
    );
    setStudySets(updated);
    saveStoredStudySets(updated);
  };

  const handleSelectSet = (set: StudySet, mode: 'flashcards' | 'quiz' | 'summary') => {
    if (soundEnabled) playHapticTap();
    setSelectedSet(set);
    setActiveTab(mode);
  };

  const updateStats = (updater: (prev: UserStats) => UserStats) => {
    setStats((prev) => {
      const next = updater(prev);
      saveStoredStats(next);
      return next;
    });
  };

  const handleAddWater = () => {
    if (soundEnabled) playHapticTap();
    updateStats((prev) => {
      const newGlasses = Math.min(12, prev.waterGlassesToday + 1);
      return {
        ...prev,
        waterGlassesToday: newGlasses,
        xp: prev.xp + 10,
      };
    });
    fireLightCelebration(0.5, 0.8);
    setActiveToast('Stay hydrated, pretty bunny! 💧 +10 XP');
    setTimeout(() => setActiveToast(null), 3000);
  };

  const handleCardMasteredReward = () => {
    updateStats((prev) => ({
      ...prev,
      totalMastered: prev.totalMastered + 1,
      xp: prev.xp + 15,
    }));
  };

  const handleCompleteQuiz = (correctCount: number, totalQuestions: number, xpGained: number) => {
    updateStats((prev) => {
      const newMastered = prev.totalMastered + correctCount;
      const newTotalAnswered = prev.totalQuestionsAnswered + totalQuestions;
      const newCorrectTotal = prev.correctAnswersTotal + correctCount;
      const newXp = prev.xp + xpGained;
      const newLevel = Math.floor(newXp / 500) + 1;

      return {
        ...prev,
        quizzesCompleted: prev.quizzesCompleted + 1,
        totalQuestionsAnswered: newTotalAnswered,
        correctAnswersTotal: newCorrectTotal,
        totalMastered: newMastered,
        xp: newXp,
        level: newLevel,
      };
    });
  };

  const handleUnlockEasterEgg = () => {};

  return (
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-chobee-pink-200 selection:text-chobee-pink-700 overflow-x-hidden bg-gradient-to-br from-[#FFF5F8] via-[#F8FAFF] to-[#F3F8FE]">
      {/* SIGNATURE ORIGINAL AESTHETIC PINK & BLUE PASTEL AMBIENT BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {/* Soft Glowing Ambient Pink & Blue Clouds & Orbs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-pink-300/40 via-rose-200/30 to-transparent blur-[100px] animate-pulse-slow" />
        <div className="absolute top-1/4 -right-32 w-[650px] h-[650px] rounded-full bg-gradient-to-bl from-sky-300/40 via-blue-200/30 to-transparent blur-[100px] animate-pulse-slow" />
        <div className="absolute -bottom-40 left-1/3 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-pink-200/35 via-purple-200/25 to-blue-200/35 blur-[120px]" />

        {/* Dreamy Soft Frosted Sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/35 via-white/10 to-white/40 backdrop-blur-[0.5px]" />
        
        {/* Soft Vignette Edges */}
        <div className="absolute inset-0 shadow-inner border-8 border-white/20 pointer-events-none" />
      </div>

      {/* Aesthetic Biome Switched Toast Notification */}
      {biomeNotification && (
        <div className="fixed top-14 sm:top-18 inset-x-0 flex justify-center z-50 pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/95 border border-pink-300 shadow-glow-dual text-xs font-black text-chobee-navy-900 backdrop-blur-xl scale-105 transition-all">
            <span className="text-base">{biomeNotification.icon}</span>
            <span>Aesthetic Biome: <span className="text-chobee-pink-600">{biomeNotification.name}</span> Activated! ✨</span>
          </div>
        </div>
      )}

      {/* App Header */}
      <div className="relative z-30">
        <Header
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (soundEnabled) playHapticTap();
            setActiveTab(tab);
          }}
          stats={stats}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenMonthsary={() => setIsMonthsaryOpen(true)}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />
      </div>

      {/* Encouraging Toast Notification */}
      {activeToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/95 border border-pink-300 shadow-soft-pink text-xs font-bold text-chobee-navy-900 backdrop-blur-md">
            <span className="text-base">🧸</span>
            <span>{activeToast}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            studySets={studySets}
            stats={stats}
            onSelectSet={handleSelectSet}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenShare={(set) => setShareModalSet(set)}
            onAddWater={handleAddWater}
            onOpenMonthsary={() => setIsMonthsaryOpen(true)}
            currentBiome={currentBiome}
            onSelectBiome={handleSelectBiome}
          />
        )}

        {activeTab === 'flashcards' && selectedSet && (
          <FlashcardView
            studySet={selectedSet}
            onUpdateSet={handleUpdateSet}
            onSwitchMode={(mode) => setActiveTab(mode as any)}
            onOpenShare={(set) => setShareModalSet(set)}
            soundEnabled={soundEnabled}
            onCardMasteredReward={handleCardMasteredReward}
          />
        )}

        {activeTab === 'quiz' && selectedSet && (
          <QuizView
            studySet={selectedSet}
            onSwitchMode={(mode) => setActiveTab(mode as any)}
            onCompleteQuiz={handleCompleteQuiz}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === 'summary' && selectedSet && (
          <SummaryView
            studySet={selectedSet}
            onSwitchMode={(mode) => setActiveTab(mode as any)}
            onOpenShare={(set) => setShareModalSet(set)}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            studySets={studySets}
            onSelectSet={handleSelectSet}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenShare={(set) => setShareModalSet(set)}
            onDeleteSet={handleDeleteSet}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </main>

      {/* DRAGGABLE & HIGHLY RESPONSIVE MY MELODY FLOATING WIDGET ("A secret for Cia 🎀") */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'fixed',
          left: customPos ? `${customPos.x}px` : undefined,
          top: customPos ? `${customPos.y}px` : undefined,
          right: !customPos ? '24px' : undefined,
          bottom: !customPos ? '80px' : undefined,
          touchAction: 'none',
          userSelect: 'none',
          zIndex: 9999,
        }}
        className="cursor-pointer active:cursor-grabbing transition-transform animate-float-melody"
      >
        <button
          type="button"
          aria-label="A secret for Mayor Cia from My Melody"
          onClick={() => {
            if (!startCoordRef.current.moved) {
              if (soundEnabled) playHapticTap();
              setIsMonthsaryOpen(true);
            }
          }}
          className="relative group p-1 rounded-[26px] bg-gradient-to-tr from-pink-300 via-white to-pink-200 shadow-soft-pink hover:shadow-glow-dual hover:scale-110 active:scale-95 transition-all border-2 border-white"
        >
          {/* My Melody 3D Avatar */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] overflow-hidden bg-pink-100 flex items-center justify-center relative shadow-inner">
            <img 
              src="/assets/my_melody_avatar.jpg" 
              alt="My Melody for Mayor Cia" 
              className="w-full h-full object-cover pointer-events-none scale-105"
            />
          </div>

          {/* Sweet Notification Pulse Badge */}
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-chobee-pink-500 border-2 border-white items-center justify-center text-[8px] text-white font-bold">
              🎀
            </span>
          </span>

          {/* Aesthetic Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 hidden group-hover:block bg-white/95 text-chobee-navy-900 border border-pink-300 text-xs font-bold px-3.5 py-2 rounded-2xl whitespace-nowrap shadow-soft-pink pointer-events-none animate-fadeIn backdrop-blur-md">
            <span className="text-chobee-pink-600 font-extrabold">My Melody 🎀:</span> Secret Note from Chobee 🧸 (Tap to open • Drag to move)
          </div>
        </button>
      </div>

      {/* App Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onStudySetCreated={handleStudySetCreated}
        soundEnabled={soundEnabled}
      />

      <ShareModal
        studySet={shareModalSet}
        onClose={() => setShareModalSet(null)}
      />

      <SecretMonthsaryModal
        isOpen={isMonthsaryOpen}
        onClose={() => setIsMonthsaryOpen(false)}
        onUnlockEasterEggAchievement={handleUnlockEasterEgg}
      />
    </div>
  );
}

export default App;
