import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  BrainCircuit, 
  Layers, 
  Award, 
  Gift, 
  Users, 
  Zap,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudySet } from '../types/study';
import { playHapticTap } from '../services/audioService';

interface LandingViewProps {
  initialSets: StudySet[];
  onSelectSampleSet: (set: StudySet) => void;
  soundEnabled?: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  initialSets,
  onSelectSampleSet,
  soundEnabled = true,
}) => {
  const { openAuthModal, referralQueryCode } = useAuth();

  return (
    <div className="space-y-10 py-6 max-w-5xl mx-auto animate-fadeIn">
      {/* Referral Banner if visited via referral link */}
      {referralQueryCode && (
        <div className="bg-gradient-to-r from-pink-100/90 via-purple-100/80 to-blue-100/90 border border-pink-300/80 rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm animate-bounceSubtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-xl shadow-xs">
              🎁
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-pink-600 block">
                Special Invitation
              </span>
              <p className="text-xs sm:text-sm font-bold text-chobee-navy-950">
                You were invited by a fellow student! Sign up now to claim your <strong>100 Daily Study Tokens</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              openAuthModal('signup');
            }}
            className="px-4 py-2 rounded-2xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-extrabold text-xs shadow-soft-pink shrink-0"
          >
            Claim Credits &rarr;
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative glass-panel rounded-[36px] p-8 sm:p-12 border-2 border-white/90 shadow-glow-dual text-center overflow-hidden">
        {/* Floating Mascot */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-chobee-pink-400 to-chobee-blue-400 p-1 mx-auto mb-6 shadow-glow-pink animate-float">
          <div className="w-full h-full bg-white rounded-3xl flex items-center justify-center text-5xl sm:text-6xl select-none">
            🧸
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-pink-100/80 border border-pink-200/90 text-chobee-pink-700 font-extrabold text-xs mb-4">
          <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500 animate-pulse" />
          <span>Multi-User AI Study & Review Companion</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-chobee-navy-950 tracking-tight font-display max-w-2xl mx-auto leading-tight">
          Reviewhin na kita with{' '}
          <span className="bg-gradient-to-r from-chobee-pink-600 to-chobee-blue-600 bg-clip-text text-transparent">
            Baby Bear Chobee
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-600 font-semibold max-w-xl mx-auto leading-relaxed">
          The satisfying AI study platform made for <strong>Mayor Cia & friends</strong>. Turn lecture slides and PDFs into 3D flashcards, Gizmo exam challenges, and sweet Taglish summaries.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              openAuthModal('signup');
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white font-black text-sm shadow-soft-pink flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Create Free Account (100 Credits)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              openAuthModal('login');
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/80 hover:bg-white border border-slate-200 text-chobee-navy-900 font-extrabold text-sm active:scale-95 transition-all shadow-xs"
          >
            Log In
          </button>
        </div>

        {/* Highlight Bullets */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3.5 rounded-2xl bg-white/70 border border-white/90">
            <div className="text-chobee-pink-500 font-black text-xs flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4" />
              <span>100 Credits/Day</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">Resets automatically every 24 hours.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-white/90">
            <div className="text-chobee-blue-500 font-black text-xs flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4" />
              <span>3D Flashcards</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">Spaced repetition with Gizmo ratings.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-white/90">
            <div className="text-purple-500 font-black text-xs flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4" />
              <span>Exam Streak XP</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">Tactile sounds & combo multipliers.</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-white/90">
            <div className="text-emerald-500 font-black text-xs flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4" />
              <span>Private Decks</span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">Isolated user data and cloud sync.</p>
          </div>
        </div>
      </div>

      {/* Preset / Sample Reviewers Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-chobee-navy-950 font-display">
              Try Out Free Sample Reviewers
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Click any subject below to test the 3D flashcards and Gizmo quizzes instantly!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialSets.map((set) => (
            <button
              key={set.id}
              onClick={() => {
                if (soundEnabled) playHapticTap();
                onSelectSampleSet(set);
              }}
              className="p-5 rounded-3xl bg-white/70 hover:bg-white/90 border-2 border-white/90 hover:border-pink-200/90 shadow-sm hover:shadow-md transition-all text-left group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  {set.category}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {set.flashcards.length} Cards
                </span>
              </div>
              <h3 className="text-base font-black text-chobee-navy-950 group-hover:text-chobee-pink-600 transition-colors">
                {set.title}
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-1 line-clamp-2">
                {set.description}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-chobee-pink-600">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Study this set &rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
