import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Layers, 
  Award, 
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
    <div className="space-y-12 py-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fadeIn">
      {/* Referral Banner if visited via referral link */}
      {referralQueryCode && (
        <div className="bg-white border border-chobee-pink-200 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-chobee-pink-50 flex items-center justify-center text-xl shrink-0">
              🎁
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-chobee-pink-600 block">
                Special Invitation
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-800">
                You were invited to study with Chobee! Sign up now to claim your <strong>100 Daily Study Tokens</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              openAuthModal('signup');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs shrink-0 active:scale-95 transition-all"
          >
            Claim Credits &rarr;
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative bg-white rounded-3xl p-8 sm:p-14 border border-slate-200 shadow-card text-center overflow-hidden">
        {/* Mascot badge */}
        <div className="w-20 h-20 rounded-3xl bg-chobee-pink-50 border border-chobee-pink-100 flex items-center justify-center text-4xl mx-auto mb-6 shadow-xs animate-float">
          🧸
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-700 font-semibold text-xs mb-4">
          <Sparkles className="w-3.5 h-3.5 text-chobee-pink-500" />
          <span>Your Smart AI Study Companion</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight font-display max-w-2xl mx-auto leading-tight">
          Study Smarter, Retain Longer with{' '}
          <span className="text-chobee-pink-600">
            Chobee
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-slate-600 font-normal max-w-xl mx-auto leading-relaxed">
          Turn your lecture slides, PDFs, and notes into interactive 3D flashcards, practice quizzes, and structured study guides in seconds.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              openAuthModal('signup');
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-chobee-pink-400" />
            <span>Create Free Account (100 Credits)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              openAuthModal('login');
            }}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm active:scale-95 transition-all shadow-2xs"
          >
            Log In
          </button>
        </div>

        {/* Highlight Bullets */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-chobee-pink-600 font-bold text-xs flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4" />
              <span>100 Credits/Day</span>
            </div>
            <p className="text-[11px] text-slate-500">Resets automatically every 24 hours.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-chobee-blue-600 font-bold text-xs flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4" />
              <span>3D Flashcards</span>
            </div>
            <p className="text-[11px] text-slate-500">Smooth flip animations and spaced repetition.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-purple-600 font-bold text-xs flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4" />
              <span>Quiz Streaks & XP</span>
            </div>
            <p className="text-[11px] text-slate-500">Instant feedback, streak combos, and scores.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <div className="text-emerald-600 font-bold text-xs flex items-center gap-1.5 mb-1">
              <Users className="w-4 h-4" />
              <span>Cloud Sync</span>
            </div>
            <p className="text-[11px] text-slate-500">Your decks saved and synced everywhere.</p>
          </div>
        </div>
      </div>

      {/* Preset / Sample Reviewers Preview */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Sample Study Materials
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select any sample reviewer below to test the 3D flashcards and quizzes instantly
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialSets.map((set) => (
            <button
              key={set.id}
              onClick={() => {
                if (soundEnabled) playHapticTap();
                onSelectSampleSet(set);
              }}
              className="p-5 rounded-2xl bg-white hover:border-slate-300 border border-slate-200 shadow-2xs hover:shadow-card transition-all text-left group active:scale-[0.99]"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {set.category}
                </span>
                <span className="text-xs font-medium text-slate-400">
                  {set.flashcards.length} Cards
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-chobee-pink-600 transition-colors line-clamp-1">
                {set.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {set.description}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-chobee-pink-600">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Open sample deck &rarr;</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
