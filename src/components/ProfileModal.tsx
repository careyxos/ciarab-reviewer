import React, { useState } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Gift, 
  Copy, 
  Check, 
  Calendar, 
  ShieldCheck, 
  Sparkles,
  Edit2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playHapticTap } from '../services/audioService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled?: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  soundEnabled = true,
}) => {
  const { user, updateProfile, logout } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !user) return null;

  const referralUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?ref=${user.referralCode}`
    : `https://ciareview.netlify.app/?ref=${user.referralCode}`;

  const handleCopy = () => {
    if (soundEnabled) playHapticTap();
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setIsSaving(true);
    try {
      await updateProfile(newName.trim());
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/70 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-pink-200/90 shadow-glow-dual ios-spring animate-scaleIn">
        {/* iOS Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300/80 mx-auto mb-4" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-chobee-navy-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Avatar */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-chobee-pink-400 to-chobee-blue-400 p-0.5 mx-auto mb-3 shadow-soft-pink">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-3xl overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>🧸</span>
              )}
            </div>
          </div>
          <h2 className="text-xl font-black text-chobee-navy-900 font-display">
            User Profile
          </h2>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-pink-100 text-pink-700 font-black text-[11px] uppercase mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>{user.role} Member</span>
          </span>
        </div>

        {/* Info Fields */}
        <div className="space-y-4 text-xs font-semibold">
          {/* Display Name */}
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1 text-slate-400 font-bold">
              <span>Display Name</span>
              {!isEditingName && (
                <button
                  onClick={() => {
                    setNewName(user.displayName);
                    setIsEditingName(true);
                  }}
                  className="text-chobee-pink-600 hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}
            </div>
            {isEditingName ? (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-sm text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400"
                />
                <button
                  onClick={handleSaveName}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-bold text-xs shadow-xs"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-sm font-black text-chobee-navy-900">{user.displayName}</div>
            )}
          </div>

          {/* Email */}
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="text-slate-400 font-bold mb-1">Email Address</div>
            <div className="text-sm font-bold text-chobee-navy-900">{user.email}</div>
          </div>

          {/* Member Since */}
          <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="text-slate-400 font-bold">Member Since</div>
              <div className="text-xs font-bold text-chobee-navy-900 mt-0.5">
                {new Date(user.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            {user.referredBy && (
              <div className="text-right">
                <div className="text-slate-400 font-bold">Invited By</div>
                <div className="text-xs font-bold text-chobee-pink-600 mt-0.5">{user.referredBy}</div>
              </div>
            )}
          </div>

          {/* Referral Link Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border border-pink-200/90 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-chobee-pink-700">
              <Gift className="w-4 h-4" />
              <span>Your Unique Referral Link</span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">
              Share with your classmates! When they click your link, they'll be welcomed to study with you.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-700 select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3.5 py-2 rounded-xl bg-chobee-pink-500 hover:bg-chobee-pink-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-soft-pink shrink-0 active:scale-95 transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Account Actions / Sign Out */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">Switch account or sign out</span>
            <button
              type="button"
              onClick={() => {
                if (soundEnabled) playHapticTap();
                logout();
                onClose();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-bold text-xs transition-all active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
