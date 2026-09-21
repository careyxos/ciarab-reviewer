import React, { useState, useEffect, useRef } from 'react';
import { fireLightCelebration } from './services/fxService';
import { 
  CheckCircle2, 
  LayoutDashboard, 
  BrainCircuit, 
  Library, 
  FileText
} from 'lucide-react';
import { StudySet, UserStats, Achievement } from './types/study';
import { 
  getStoredStudySets, 
  saveStoredStudySets, 
  getStoredStats, 
  saveStoredStats, 
  getStoredAchievements, 
  saveStoredAchievements,
  parseSharedSetFromUrl,
  fetchCloudStudySets,
  saveStudySetToCloud,
  deleteStudySetFromCloud,
  subscribeToCloudStudySets
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
import { AuthModal } from './components/AuthModal';
import { ProfileModal } from './components/ProfileModal';
import { UsageView } from './components/UsageView';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingView } from './components/LandingView';
import { useAuth } from './context/AuthContext';
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
  const { user, isLoggedIn, isAdmin, isAuthModalOpen, closeAuthModal, authModalMode } = useAuth();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [selectedSet, setSelectedSet] = useState<StudySet | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'flashcards' | 'quiz' | 'summary' | 'library' | 'usage' | 'admin'>('dashboard');
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Check URL pathname or query for /admin route
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path === '/admin' || params.get('tab') === 'admin') {
        if (isAdmin) {
          setActiveTab('admin');
        } else {
          setActiveTab('dashboard');
        }
      }
    }
  }, [isAdmin]);

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

  // Cloud Study Sets Synchronization (Fetch per user & listen to Realtime changes across devices)
  useEffect(() => {
    if (user?.id) {
      fetchCloudStudySets(user.id).then((cloudSets) => {
        if (cloudSets && cloudSets.length > 0) {
          setStudySets(cloudSets);
          setSelectedSet((prev) => (prev ? cloudSets.find((s) => s.id === prev.id) || cloudSets[0] : cloudSets[0]));
        }
      });

      const unsubscribe = subscribeToCloudStudySets(user.id, (freshSets) => {
        setStudySets(freshSets);
        setSelectedSet((prev) => (prev ? freshSets.find((s) => s.id === prev.id) || freshSets[0] : freshSets[0]));
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user?.id]);

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
    if (user?.id) {
      saveStudySetToCloud(user.id, newSet);
    } else {
      saveStoredStudySets(updated);
    }
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
    if (user?.id) {
      saveStudySetToCloud(user.id, updatedSet);
    } else {
      saveStoredStudySets(updated);
    }
    setSelectedSet(updatedSet);
  };

  const handleDeleteSet = (setId: string) => {
    const updated = studySets.filter((s) => s.id !== setId);
    setStudySets(updated);
    if (user?.id) {
      deleteStudySetFromCloud(user.id, setId);
    } else {
      saveStoredStudySets(updated);
    }
    if (selectedSet?.id === setId) {
      setSelectedSet(updated[0] || null);
      setActiveTab('dashboard');
    }
  };

  const handleToggleFavorite = (setId: string) => {
    const target = studySets.find((s) => s.id === setId);
    if (!target) return;
    const updatedTarget = { ...target, isFavorite: !target.isFavorite };
    const updated = studySets.map((s) => (s.id === setId ? updatedTarget : s));
    setStudySets(updated);
    if (user?.id) {
      saveStudySetToCloud(user.id, updatedTarget);
    } else {
      saveStoredStudySets(updated);
    }
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
    <div className="min-h-screen relative flex flex-col justify-between selection:bg-pink-100 selection:text-pink-700 bg-[#FAF9F6] text-slate-800">
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
          onOpenProfile={() => setIsProfileOpen(true)}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
        />
      </div>

      {/* Encouraging Toast Notification */}
      {activeToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 animate-fadeIn">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-pink-200/90 shadow-soft-pink text-xs font-semibold text-chobee-navy-900">
            <span className="text-base select-none">🧸</span>
            <span>{activeToast}</span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 pb-16 lg:pb-8">
        {activeTab === 'dashboard' && (
          isLoggedIn ? (
            <Dashboard
              studySets={studySets}
              stats={stats}
              onSelectSet={handleSelectSet}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenShare={(set) => setShareModalSet(set)}
              onAddWater={handleAddWater}
              onOpenMonthsary={() => setIsMonthsaryOpen(true)}
              onNavigateToUsage={() => setActiveTab('usage')}
              currentBiome={currentBiome}
              onSelectBiome={handleSelectBiome}
            />
          ) : (
            <LandingView
              initialSets={studySets}
              onSelectSampleSet={(set) => handleSelectSet(set, 'flashcards')}
              soundEnabled={soundEnabled}
            />
          )
        )}

        {activeTab === 'usage' && (
          <UsageView
            onBackToDashboard={() => setActiveTab('dashboard')}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminDashboard
              onBackToDashboard={() => setActiveTab('dashboard')}
              soundEnabled={soundEnabled}
            />
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="text-4xl">🔒</div>
              <h2 className="text-xl font-black text-chobee-navy-950 font-display">
                Access Restricted
              </h2>
              <p className="text-xs text-slate-500 font-semibold">
                You need Administrator privileges to view this console.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-chobee-navy-900"
              >
                Return to Dashboard
              </button>
            </div>
          )
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

      {/* MOBILE MODERN BOTTOM NAVIGATION BAR */}
      {isLoggedIn && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-sm">
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              setActiveTab('dashboard');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
              activeTab === 'dashboard'
                ? 'text-chobee-pink-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              setActiveTab('library');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
              activeTab === 'library'
                ? 'text-chobee-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Materials</span>
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              setActiveTab('flashcards');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
              activeTab === 'flashcards'
                ? 'text-purple-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Cards</span>
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              setActiveTab('quiz');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
              activeTab === 'quiz'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Quiz</span>
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              setActiveTab('summary');
            }}
            className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95 ${
              activeTab === 'summary'
                ? 'text-amber-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Guide</span>
          </button>
        </nav>
      )}

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

      {/* Auth Modal (Login / Sign Up / Reset Password) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
        soundEnabled={soundEnabled}
      />

      {/* User Profile & Referral Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        soundEnabled={soundEnabled}
        onOpenMonthsary={() => setIsMonthsaryOpen(true)}
      />
    </div>
  );
}

export default App;
