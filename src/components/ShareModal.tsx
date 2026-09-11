import React, { useState } from 'react';
import { X, Copy, Check, Share2, Users, Sparkles, QrCode } from 'lucide-react';
import { StudySet } from '../types/study';
import { generateShareableLink } from '../services/storageService';

interface ShareModalProps {
  studySet: StudySet | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ studySet, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!studySet) return null;

  const shareLink = generateShareableLink(studySet);

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-blue-200 shadow-glow-dual space-y-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-chobee-navy-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-400 to-pink-400 flex items-center justify-center text-white shadow-soft-blue">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-chobee-navy-900 font-display">
              Share with Classmates
            </h2>
            <p className="text-xs text-chobee-blue-600 font-semibold">
              Zero-login required • Study directly with classmates
            </p>
          </div>
        </div>

        {/* Set Summary Card */}
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-chobee-navy-900 font-display">
              {studySet.title}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {studySet.category}
            </span>
          </div>
          <p className="text-xs text-chobee-navy-700/70 line-clamp-2">
            {studySet.description}
          </p>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-chobee-navy-700/80 pt-1">
            <span>⚡ {studySet.flashcards.length} Flashcards</span>
            <span>🎯 {studySet.quizQuestions.length} Practice Questions</span>
            <span>📝 Study Guide</span>
          </div>
        </div>

        {/* Classmate Zero-Login Note */}
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 text-xs text-purple-900 leading-relaxed">
          <Users className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <span>
            Anyone with this link can immediately study flashcards and take quizzes without signing up or creating an account.
          </span>
        </div>

        {/* Share Link Copy Field */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-chobee-navy-800">Direct Share Link</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 select-all font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-chobee-navy-900 hover:bg-chobee-navy-800 text-white active:scale-95'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[11px] text-chobee-navy-700/60">
            Specially prepared by Mayor Cia & Baby Bear Chobee 🧸🩵
          </p>
        </div>
      </div>
    </div>
  );
};
