import React from 'react';
import { X, Award, CheckCircle2, Lock, Sparkles, Star } from 'lucide-react';
import { Achievement, UserStats } from '../types/study';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
  stats: UserStats;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
  stats,
}) => {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-6 sm:p-8 border border-purple-200 shadow-glow-dual max-h-[90vh] overflow-y-auto space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-chobee-navy-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl shadow-soft-pink">
            👑
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-chobee-navy-900 font-display">
              Mayor’s Honor Roll & Badges
            </h2>
            <p className="text-xs text-purple-600 font-semibold">
              Earn XP, level up, and unlock achievements with Baby Bear Chobee
            </p>
          </div>
        </div>

        {/* Level Progression Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 border border-purple-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 font-display">
                Current Rank:
              </span>
              <span className="text-sm font-extrabold text-chobee-navy-900">
                {stats.rankTitle} (Lvl {stats.level})
              </span>
            </div>
            <span className="text-xs font-bold text-chobee-pink-600 font-display">
              {stats.xp} Total XP
            </span>
          </div>

          <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-purple-100">
            <div
              className="bg-gradient-to-r from-purple-500 to-chobee-pink-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.xp % 500) / 5)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-chobee-navy-700/70">
            <span>Progress to Level {stats.level + 1}</span>
            <span>{500 - (stats.xp % 500)} XP needed</span>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-chobee-navy-900">
              Badge Collection ({unlockedCount} / {achievements.length} Unlocked)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  ach.unlocked
                    ? 'bg-white/90 border-pink-200/80 shadow-xs'
                    : 'bg-slate-50/70 border-slate-200 opacity-60'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-xs ${
                    ach.unlocked
                      ? 'bg-gradient-to-tr from-pink-100 to-purple-100 border border-pink-200'
                      : 'bg-slate-200 border border-slate-300'
                  }`}
                >
                  {ach.unlocked ? ach.icon : '🔒'}
                </div>

                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-chobee-navy-900 font-display">
                      {ach.title}
                    </h4>
                    {ach.unlocked && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-chobee-navy-700/70 leading-relaxed">
                    {ach.description}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                    <span>
                      Progress: {ach.progress} / {ach.maxProgress}
                    </span>
                    {ach.unlockedAt && (
                      <span className="text-chobee-pink-500">Unlocked: {ach.unlockedAt}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
