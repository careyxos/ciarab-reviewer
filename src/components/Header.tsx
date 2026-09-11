import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, 
  Volume2, 
  VolumeX, 
  Headphones, 
  LayoutDashboard,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Library,
  ChevronDown,
  User as UserIcon,
  Zap,
  LogOut,
  Crown
} from 'lucide-react';
import { UserStats } from '../types/study';
import { lofiPlayer, playHapticTap } from '../services/audioService';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeTab: 'dashboard' | 'flashcards' | 'quiz' | 'summary' | 'library' | 'usage' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'flashcards' | 'quiz' | 'summary' | 'library' | 'usage' | 'admin') => void;
  stats: UserStats;
  onOpenUpload: () => void;
  onOpenMonthsary: () => void;
  onOpenProfile: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onOpenUpload,
  onOpenMonthsary,
  onOpenProfile,
  soundEnabled,
  setSoundEnabled,
}) => {
  const { user, dailyUsage, isLoggedIn, isAdmin, logout, openAuthModal } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [isLofiPlaying, setIsLofiPlaying] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      const name = user ? user.displayName : 'Mayor Cia';
      if (hour >= 5 && hour < 12) {
        setGreeting(`Good morning, ${name} 🌸`);
      } else if (hour >= 12 && hour < 18) {
        setGreeting(`Good afternoon, ${name} 💙`);
      } else {
        setGreeting(`Good evening, ${name} 🌙`);
      }
    };

    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
  }, [user]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLofi = () => {
    if (isLofiPlaying) {
      lofiPlayer.stop();
      setIsLofiPlaying(false);
    } else {
      lofiPlayer.play();
      setIsLofiPlaying(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-pink-100/70 shadow-sm transition-all">
      {/* Top Banner with Dynamic Greeting */}
      <div className="bg-gradient-to-r from-chobee-pink-100/90 via-pink-50 to-chobee-blue-100/90 py-1.5 px-3 sm:px-8 border-b border-pink-200/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-medium text-chobee-navy-800">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-chobee-pink-400 animate-ping flex-shrink-0" />
            <span className="font-semibold text-chobee-pink-600 font-display tracking-wide truncate">{greeting}</span>
            <span className="hidden md:inline text-chobee-navy-700/60">• Rereviewhin ka ng Baby Bear mo 🧸🩵</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Ambient Study Beats Button */}
            <button
              onClick={toggleLofi}
              title={isLofiPlaying ? 'Pause Study Music' : 'Play Cozy Study Music'}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                isLofiPlaying
                  ? 'bg-chobee-blue-500 text-white shadow-sm ring-2 ring-chobee-blue-200'
                  : 'bg-white/80 hover:bg-white text-chobee-navy-800 border border-blue-200'
              }`}
            >
              <Headphones className={`w-3.5 h-3.5 ${isLofiPlaying ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isLofiPlaying ? 'Cozy Music: ON' : 'Study Beats'}</span>
            </button>

            {/* Sound FX Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
              className="text-chobee-navy-700 hover:text-chobee-pink-500 transition-colors p-1"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main App Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group select-none min-w-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-chobee-pink-400 via-pink-300 to-chobee-blue-300 p-0.5 shadow-soft-pink group-hover:scale-105 transition-transform duration-300 flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-lg sm:text-xl">
                🧸
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-display font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-chobee-pink-500 via-purple-600 to-chobee-blue-500 bg-clip-text text-transparent truncate">
                  Reviewhin na kita
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-chobee-pink-100 text-chobee-pink-600 font-bold border border-pink-200 flex-shrink-0">
                  Chobee
                </span>
              </div>
              <p className="text-[11px] text-chobee-navy-700/70 hidden sm:block">
                Smart Study Platform • Built specially for My Mayor Cia
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          {isLoggedIn && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-100/60 p-1 rounded-2xl border border-slate-200/60 backdrop-blur-md">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-chobee-pink-600 shadow-sm'
                    : 'text-chobee-navy-700 hover:text-chobee-navy-900 hover:bg-white/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'library'
                    ? 'bg-white text-chobee-blue-600 shadow-sm'
                    : 'text-chobee-navy-700 hover:text-chobee-navy-900 hover:bg-white/50'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>Materials</span>
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'flashcards'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-chobee-navy-700 hover:text-chobee-navy-900 hover:bg-white/50'
                }`}
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Flashcards</span>
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'quiz'
                    ? 'bg-white text-chobee-pink-600 shadow-sm'
                    : 'text-chobee-navy-700 hover:text-chobee-navy-900 hover:bg-white/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Quiz Mode</span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'summary'
                    ? 'bg-white text-chobee-blue-600 shadow-sm'
                    : 'text-chobee-navy-700 hover:text-chobee-navy-900 hover:bg-white/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Study Guide</span>
              </button>
            </nav>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {isLoggedIn ? (
              <>
                {/* Daily AI Token HUD Pill */}
                <button
                  onClick={() => {
                    if (soundEnabled) playHapticTap();
                    setActiveTab('usage');
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/80 shadow-xs transition-all text-left active:scale-95 group"
                  title={`Resets in ${dailyUsage.resetCountdown}`}
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-xl bg-pink-100 flex items-center justify-center text-xs flex-shrink-0">
                    🧠
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-0.5 sm:gap-1 text-xs font-black text-chobee-navy-900 leading-none">
                      <span>{user?.role === 'admin' ? 'Unlimited' : `${dailyUsage.remaining}`}</span>
                      <span className="hidden sm:inline font-normal text-slate-400">/{dailyUsage.allocated}</span>
                      {dailyUsage.remaining <= 20 && user?.role !== 'admin' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 font-mono hidden sm:inline">
                      {dailyUsage.resetCountdown}
                    </span>
                  </div>
                </button>

                {/* Primary Action Button: + Create Study Set */}
                <button
                  onClick={onOpenUpload}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white font-semibold text-xs sm:text-sm shadow-soft-pink hover:shadow-glow-dual transition-all transform active:scale-95 flex-shrink-0"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Set</span>
                  <span className="sm:hidden">New</span>
                </button>

                {/* Profile & Settings Dropdown Menu */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => {
                      if (soundEnabled) playHapticTap();
                      setIsUserMenuOpen(!isUserMenuOpen);
                    }}
                    className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200/80 shadow-xs transition-all active:scale-95"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-chobee-pink-400 to-chobee-blue-400 p-0.5 flex items-center justify-center text-sm shadow-xs">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                        🧸
                      </div>
                    </div>
                    <span className="hidden md:inline font-bold text-xs text-chobee-navy-900 max-w-[85px] truncate">
                      {user?.displayName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl border border-pink-200/90 shadow-xl py-2 z-50 animate-scaleIn text-xs font-bold text-chobee-navy-900">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <div className="text-sm font-black truncate">{user?.displayName}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-100 text-pink-700">
                          {user?.role} plan
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setActiveTab('dashboard');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-chobee-pink-500" />
                          <span>Study Dashboard</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('library');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors"
                        >
                          <Library className="w-4 h-4 text-chobee-blue-500" />
                          <span>My Study Materials</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('usage');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors"
                        >
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span>Daily AI Tokens ({dailyUsage.remaining})</span>
                        </button>

                        <button
                          onClick={() => {
                            onOpenProfile();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-pink-50/80 flex items-center gap-2.5 transition-colors"
                        >
                          <UserIcon className="w-4 h-4 text-purple-500" />
                          <span>Profile & Referral Link</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setActiveTab('admin');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-purple-50 flex items-center gap-2.5 transition-colors text-purple-700"
                          >
                            <Crown className="w-4 h-4 text-purple-600" />
                            <span>Admin Console</span>
                          </button>
                        )}
                      </div>

                      <div className="pt-1 border-t border-slate-100">
                        <button
                          onClick={() => {
                            logout();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2.5 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Logged Out Buttons */
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3.5 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-bold text-chobee-navy-900 border border-slate-200/80 shadow-xs active:scale-95 transition-all"
                >
                  Log In
                </button>

                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white text-xs font-black shadow-soft-pink active:scale-95 transition-all"
                >
                  Sign Up (Free)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
