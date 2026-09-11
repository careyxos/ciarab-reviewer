import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Gift, 
  Eye, 
  EyeOff,
  Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { playHapticTap, playCelebrationSound } from '../services/audioService';
import { fireLightCelebration } from '../services/fxService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'reset';
  soundEnabled?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  soundEnabled = true,
}) => {
  const { login, signup, resetPassword, referralQueryCode } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (referralQueryCode) {
      setReferralCode(referralQueryCode);
      if (initialMode === 'login') {
        setMode('signup');
      }
    }
  }, [initialMode, referralQueryCode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (soundEnabled) playHapticTap();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        if (soundEnabled) playCelebrationSound();
        fireLightCelebration(0.5, 0.4);
      } else if (mode === 'signup') {
        await signup(email, password, displayName, referralCode);
        if (soundEnabled) playCelebrationSound();
        fireLightCelebration(0.5, 0.5);
      } else if (mode === 'reset') {
        const msg = await resetPassword(email, password);
        setSuccessMessage(msg || 'Password updated! You can now log in.');
        setTimeout(() => setMode('login'), 2000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
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

        {/* Mascot Avatar & Title */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-chobee-pink-400 to-chobee-blue-400 p-0.5 mx-auto mb-3 shadow-soft-pink">
            <div className="w-full h-full bg-white rounded-2xl flex items-center justify-center text-3xl">
              🧸
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-chobee-navy-900 tracking-tight font-display">
            {mode === 'login' && 'Welcome Back to Chobee!'}
            {mode === 'signup' && 'Create Your Study Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {mode === 'login' && 'Log in to continue your streak and access your daily AI study credits.'}
            {mode === 'signup' && 'Get 100 Free Daily AI Study Credits + your own personal decks.'}
            {mode === 'reset' && 'Enter your email and new password to restore access.'}
          </p>
        </div>

        {/* Mode Switch Tabs */}
        {mode !== 'reset' && (
          <div className="flex bg-slate-100/90 p-1 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-chobee-navy-900 shadow-sm'
                  : 'text-slate-500 hover:text-chobee-navy-900'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-white text-chobee-navy-900 shadow-sm'
                  : 'text-slate-500 hover:text-chobee-navy-900'
              }`}
            >
              Sign Up (Free)
            </button>
          </div>
        )}

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50/90 border border-red-200 text-xs text-red-600 flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Your Name / Nickname</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Mayor Cia, Alex, etc."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white/90 text-sm font-semibold text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400 focus:ring-2 focus:ring-chobee-pink-100 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white/90 text-sm font-semibold text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400 focus:ring-2 focus:ring-chobee-pink-100 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-600">
                {mode === 'reset' ? 'New Password' : 'Password'}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('reset');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] font-bold text-chobee-pink-600 hover:text-chobee-pink-700 hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 bg-white/90 text-sm font-semibold text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400 focus:ring-2 focus:ring-chobee-pink-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="CHOBEE-XXXXX"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white/90 text-sm font-mono font-semibold text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400 focus:ring-2 focus:ring-chobee-pink-100 transition-all"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500 hover:from-chobee-pink-600 hover:to-chobee-blue-600 text-white shadow-soft-pink active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  {mode === 'login' && 'Log In to Chobee'}
                  {mode === 'signup' && 'Create Free Account'}
                  {mode === 'reset' && 'Update Password'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {mode === 'reset' && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-xs font-bold text-slate-500 hover:text-chobee-pink-600"
            >
              &larr; Back to Log In
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-200/80 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-semibold">
            <span>Made with love for Mayor Cia & friends</span>
            <Heart className="w-3 h-3 text-chobee-pink-500 fill-chobee-pink-500" />
          </p>
        </div>
      </div>
    </div>
  );
};
