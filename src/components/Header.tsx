import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
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
      const name = user ? user.displayName : 'Ciara';
      if (hour >= 5 && hour < 12) {
        setGreeting(`Good morning, ${name} 🌸`);
      } else if (hour >= 12 && hour < 18) {
        setGreeting(`Good afternoon, ${name} 🌤️`);
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
    <header className="sticky top-0 z-40 w-full glass-nav shadow-xs transition-all">
      {/* Top Subtle Utility Bar */}
      <div className="bg-[#FAF8F5]/80 border-b border-slate-100/90 py-1 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-chobee-pink-400 shrink-0" />
            <span className="font-semibold text-slate-700 truncate">{greeting}</span>
            <span className="hidden md:inline text-slate-400">• Ready for a productive review session</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Ambient Study Beats Button */}
            <button
              onClick={toggleLofi}
              title={isLofiPlaying ? 'Pause Cozy Music' : 'Play Cozy Study Beats'}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                isLofiPlaying
                  ? 'bg-chobee-blue-50 text-chobee-blue-600 border border-chobee-blue-200 shadow-xs'
                  : 'hover:bg-slate-100 text-slate-600 border border-transparent'
              }`}
            >
              <Headphones className={`w-3.5 h-3.5 ${isLofiPlaying ? 'text-chobee-blue-500 animate-pulse' : ''}`} />
              <span className="hidden sm:inline">{isLofiPlaying ? 'Lofi Music: On' : 'Cozy Beats'}</span>
            </button>

            {/* Sound FX Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-slate-300" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          {/* Logo & Clean Branding */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer group select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-2xl bg-chobee-pink-50 border border-chobee-pink-200/80 p-0.5 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-xl select-none leading-none">🧸</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-base sm:text-lg text-chobee-navy-900 tracking-tight">
                  Chobee
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-chobee-pink-50 text-chobee-pink-600 font-bold border border-chobee-pink-100">
                  Study
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block -mt-0.5">
                Your smart study companion
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
          {isLoggedIn && (
            <nav className="hidden lg:flex items-center gap-1 bg-slate-50/80 p-1 rounded-2xl border border-slate-200/70">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white text-chobee-navy-900 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-chobee-navy-900 hover:bg-white/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-chobee-pink-500" />
                <span>Dashboard</span>
              </button>

              <button
                onClick={() => setActiveTab('library')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'library'
                    ? 'bg-white text-chobee-navy-900 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-chobee-navy-900 hover:bg-white/60'
                }`}
              >
                <Library className="w-3.5 h-3.5 text-chobee-blue-500" />
                <span>Materials</span>
              </button>

              <button
                onClick={() => setActiveTab('flashcards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'flashcards'
                    ? 'bg-white text-chobee-navy-900 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-chobee-navy-900 hover:bg-white/60'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5 text-purple-500" />
                <span>Flashcards</span>
              </button>

              <button
                onClick={() => setActiveTab('quiz')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'quiz'
                    ? 'bg-white text-chobee-navy-900 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-chobee-navy-900 hover:bg-white/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Quiz</span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'summary'
                    ? 'bg-white text-chobee-navy-900 shadow-xs border border-slate-200/60 font-bold'
                    : 'text-slate-600 hover:text-chobee-navy-900 hover:bg-white/60'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Guide</span>
              </button>
            </nav>
          )}

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isLoggedIn ? (
              <>
                {/* Daily AI Token HUD Pill */}
                <button
                  onClick={() => {
                    if (soundEnabled) playHapticTap();
                    setActiveTab('usage');
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-left transition-all active:scale-95 group shadow-xs"
                  title={`Resets in ${dailyUsage.resetCountdown}`}
                >
                  <div className="w-5 h-5 rounded-lg bg-chobee-pink-50 text-chobee-pink-500 flex items-center justify-center text-xs shrink-0 font-bold">
                    <Zap className="w-3 h-3 fill-chobee-pink-400 text-chobee-pink-500" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1 text-xs font-bold text-chobee-navy-900 leading-none">
                      <span>{user?.role === 'admin' ? 'Unlimited' : `${dailyUsage.remaining}`}</span>
                      <span className="hidden sm:inline font-normal text-slate-400">/{dailyUsage.allocated}</span>
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 hidden sm:inline -mt-0.5">
                      Resets {dailyUsage.resetCountdown}
                    </span>
                  </div>
                </button>

                {/* Primary Action Button: + Create Study Set */}
                <button
                  onClick={onOpenUpload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-semibold text-xs sm:text-sm shadow-soft-pink transition-all transform active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
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
                    className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-xs"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-pink-100 to-blue-100 flex items-center justify-center text-sm font-bold text-chobee-navy-800">
                      {user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : '🧸'}
                    </div>
                    <span className="hidden md:inline font-semibold text-xs text-chobee-navy-900 max-w-[90px] truncate">
                      {user?.displayName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200/90 shadow-lg py-2 z-50 animate-scaleIn text-xs font-medium text-chobee-navy-900">
                      <div className="px-3.5 py-2 border-b border-slate-100">
                        <div className="font-bold text-chobee-navy-900 truncate">{user?.displayName}</div>
                        <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-pink-50 text-pink-700 border border-pink-100">
                          {user?.role} plan
                        </span>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setActiveTab('dashboard');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5 text-chobee-pink-500" />
                          <span>Study Dashboard</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('library');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <Library className="w-3.5 h-3.5 text-chobee-blue-500" />
                          <span>Materials Library</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('usage');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Daily AI Tokens ({dailyUsage.remaining})</span>
                        </button>

                        <button
                          onClick={() => {
                            onOpenProfile();
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-purple-500" />
                          <span>Profile & Referral Link</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setActiveTab('admin');
                              setIsUserMenuOpen(false);
                            }}
                            className="w-full px-3.5 py-2 text-left hover:bg-purple-50 flex items-center gap-2.5 transition-colors text-purple-700 font-semibold"
                          >
                            <Crown className="w-3.5 h-3.5 text-purple-600" />
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
                          className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
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
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-chobee-navy-900 border border-slate-200 transition-all shadow-xs"
                >
                  Log In
                </button>

                <button
                  onClick={() => openAuthModal('signup')}
                  className="px-3.5 py-1.5 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white text-xs font-semibold shadow-soft-pink transition-all"
                >
                  Get Started Free
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
