import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Award, 
  BookOpen, 
  PlusCircle, 
  Volume2, 
  VolumeX, 
  Headphones, 
  Heart,
  LayoutDashboard,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Library
} from 'lucide-react';
import { UserStats } from '../types/study';
import { lofiPlayer } from '../services/audioService';

interface HeaderProps {
  activeTab: 'dashboard' | 'flashcards' | 'quiz' | 'summary' | 'library';
  setActiveTab: (tab: 'dashboard' | 'flashcards' | 'quiz' | 'summary' | 'library') => void;
  stats: UserStats;
  onOpenUpload: () => void;
  onOpenMonthsary: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  stats,
  onOpenUpload,
  onOpenMonthsary,
  soundEnabled,
  setSoundEnabled,
}) => {
  const [greeting, setGreeting] = useState('');
  const [isLofiPlaying, setIsLofiPlaying] = useState(false);

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) {
        setGreeting('Good morning, my pretty Mayor 🌸');
      } else if (hour >= 12 && hour < 18) {
        setGreeting('Good afternoon, Love lovee ko / Pretty Treasurer 💙');
      } else {
        setGreeting('Good evening, my pretty bunny 🌙');
      }
    };

    updateGreeting();
    const timer = setInterval(updateGreeting, 60000);
    return () => clearInterval(timer);
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
      <div className="bg-gradient-to-r from-chobee-pink-100/90 via-pink-50 to-chobee-blue-100/90 py-1.5 px-4 sm:px-8 border-b border-pink-200/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-medium text-chobee-navy-800">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-chobee-pink-400 animate-ping" />
            <span className="font-semibold text-chobee-pink-600 font-display tracking-wide">{greeting}</span>
            <span className="hidden md:inline text-chobee-navy-700/60">• Rereviewhin ka ng Baby Bear mo 🧸🩵</span>
          </div>
          <div className="flex items-center gap-4">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-chobee-pink-400 via-pink-300 to-chobee-blue-300 p-0.5 shadow-soft-pink group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-xl">
                🧸
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-chobee-pink-500 via-purple-600 to-chobee-blue-500 bg-clip-text text-transparent">
                  Reviewhin na kita
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-chobee-pink-100 text-chobee-pink-600 font-bold border border-pink-200">
                  Chobee AI
                </span>
              </div>
              <p className="text-[11px] text-chobee-navy-700/70 hidden sm:block">
                Smart Study Platform • Built specially for My Mayor Cia
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs (Desktop) */}
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

          {/* Right Action & Stats Bar */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Primary Action Button: + Create Study Set */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white font-semibold text-xs sm:text-sm shadow-soft-pink hover:shadow-glow-dual transition-all transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Create Set</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
