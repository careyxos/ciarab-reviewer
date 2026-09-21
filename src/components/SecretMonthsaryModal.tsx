import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Heart, 
  Play, 
  Pause 
} from 'lucide-react';
import { ROMANTIC_DATA } from '../data/memories';
import { lofiPlayer, playHapticTap } from '../services/audioService';
import { fireLightCelebration, clearCelebration } from '../services/fxService';

interface SecretMonthsaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockEasterEggAchievement: () => void;
}

export const SecretMonthsaryModal: React.FC<SecretMonthsaryModalProps> = ({
  isOpen,
  onClose,
  onUnlockEasterEggAchievement,
}) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (isOpen && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onUnlockEasterEggAchievement();
      fireLightCelebration(0.5, 0.85);
    }
    if (!isOpen) {
      hasFiredRef.current = false;
      clearCelebration();
    }
    return () => {
      clearCelebration();
    };
  }, [isOpen]);

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
    setVolume(val);
    lofiPlayer.setVolume(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-chobee-navy-950/70 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-2xl glass-panel rounded-3xl p-5 sm:p-8 border border-pink-200/90 shadow-glow-dual max-h-[92vh] overflow-y-auto space-y-5 gpu-accelerated ios-spring">
        {/* iOS Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300/80 mx-auto -mt-1 mb-2" />

        {/* Close Button */}
        <button
          onClick={() => {
            playHapticTap();
            onClose();
          }}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-pink-100 text-slate-400 hover:text-chobee-pink-600 transition-colors z-20 active:scale-90"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-pink-100 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-chobee-pink-400 via-pink-300 to-chobee-blue-400 p-0.5 shadow-soft-pink flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-2xl animate-pulse">
                🧸
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-chobee-navy-900 font-display">
                  {ROMANTIC_DATA.loveLetter.title}
                </h2>
                <span className="text-sm">🌸</span>
              </div>
              <p className="text-xs text-chobee-pink-600 font-semibold">
                Carey (#33) 🧸 x Ciara (#14) 🐰 • Specially made for My Mayor & ChiCha
              </p>
            </div>
          </div>

          {/* Music Controller */}
          <div className="flex items-center gap-2 bg-white/80 border border-pink-200 px-3 py-1.5 rounded-2xl shadow-xs self-start sm:self-center">
            <button
              onClick={toggleMusic}
              className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                isMusicPlaying
                  ? 'bg-chobee-pink-500 text-white'
                  : 'bg-pink-50 text-chobee-pink-600 hover:bg-pink-100'
              }`}
              title={isMusicPlaying ? 'Pause Melody' : 'Play Sweet Melody'}
            >
              {isMusicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <div className="text-[11px] font-bold text-chobee-navy-800 flex flex-col">
              <span>{isMusicPlaying ? 'Cozy Music: ON' : 'Study Melody'}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-14 h-1 accent-chobee-pink-500 cursor-pointer"
            />
          </div>
        </div>

        {/* AESTHETIC POLAROID SNAPSHOTS: Pink Cybershot & Coquette Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Polaroid 1: Pink Vintage Sony Cybershot */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-50 via-white to-pink-100/70 border border-pink-200/90 shadow-sm flex items-center gap-3 group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
              <img 
                src="/assets/aesthetic_vintage_camera.jpg" 
                alt="Vintage Pink Cybershot" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-chobee-pink-600 uppercase tracking-wider">
                <span>📸</span>
                <span>Pretty Soul, Pretty Girl</span>
              </div>
              <p className="text-xs font-bold text-chobee-navy-900 leading-snug">
                "I could love you for the rest of my life."
              </p>
              <span className="text-[10px] text-slate-400 block">
                Sony Cyber-shot Memory • #33 & #14
              </span>
            </div>
          </div>

          {/* Polaroid 2: Coquette Ribbon & Pearls */}
          <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-50 via-white to-purple-50/70 border border-pink-200/90 shadow-sm flex items-center gap-3 group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-white shadow-md flex-shrink-0">
              <img 
                src="/assets/aesthetic_ribbon_pearls.jpg" 
                alt="Coquette Ribbon & Pearls" 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-bold text-chobee-pink-600 uppercase tracking-wider">
                <span>🎀</span>
                <span>Silk Bow & Pearls</span>
              </div>
              <p className="text-xs font-bold text-chobee-navy-900 leading-snug">
                "Ikaw ang pinakamagandang melody sa buhay ko."
              </p>
              <span className="text-[10px] text-slate-400 block">
                With all of Chobee's heart 🧸
              </span>
            </div>
          </div>
        </div>

        {/* HEARTFELT LOVE LETTER FROM CHOBEE */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-pink-200 space-y-4 animate-fadeIn bg-white/95 relative overflow-hidden">
          {/* Subtle floral watermark */}
          <div 
            className="absolute -right-10 -bottom-10 w-48 h-48 bg-contain bg-no-repeat opacity-10 pointer-events-none"
            style={{ backgroundImage: `url('/assets/aesthetic_lace_lilies.jpg')` }}
          />

          <div className="flex items-center justify-between border-b border-pink-100 pb-3 relative z-10">
            <span className="text-xs font-bold text-chobee-pink-600">
              Dear {ROMANTIC_DATA.loveLetter.recipient},
            </span>
            <span className="text-xs text-slate-400 font-medium">Written with all my heart</span>
          </div>

          <div className="space-y-4 text-sm text-chobee-navy-800 leading-relaxed font-medium relative z-10">
            {ROMANTIC_DATA.loveLetter.paragraphs.map((para, idx) => (
              <p key={idx} className="leading-relaxed">
                {para}
              </p>
            ))}
          </div>

          <div className="pt-4 border-t border-pink-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-chobee-navy-900 relative z-10">
            <span className="text-chobee-pink-600 font-semibold italic">
              {ROMANTIC_DATA.loveLetter.postscript}
            </span>
            <span className="text-right">{ROMANTIC_DATA.loveLetter.sender}</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center pt-2 border-t border-pink-100">
          <p className="text-xs font-semibold text-chobee-navy-700/70">
            "You are my favorite notification, my sweetest prayer, and my safest home." 🧸🩵
          </p>
        </div>
      </div>
    </div>
  );
};
