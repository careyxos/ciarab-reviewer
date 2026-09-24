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
  const { login, loginWithGoogle, signup, resetPassword, referralQueryCode } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    if (soundEnabled) playHapticTap();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsGoogleLoading(true);

    try {
      await loginWithGoogle();
      // Browser will redirect to Google authentication
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(err?.message || 'Unable to connect to Google Sign-In. Please check your connection.');
    }
  };

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
            {mode === 'login' && 'Welcome to CIA Review'}
            {mode === 'signup' && 'Create Your Student Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {mode === 'login' && 'Sign in to access your study decks, quiz streaks, and daily AI credits.'}
            {mode === 'signup' && 'Get 100 Free Daily AI Study Credits + personal cloud study decks.'}
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
            <div className="font-semibold leading-relaxed">
              <span>{errorMessage}</span>
              {errorMessage.includes('Sign Up') && mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="block mt-1 underline text-pink-600 font-bold hover:text-pink-700"
                >
                  👉 Click here to create your account now
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Google Sign-In Button */}
        {mode !== 'reset' && (
          <div className="mb-4">
            <button
              type="button"
              disabled={isGoogleLoading || isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border border-slate-200/90 text-chobee-navy-900 shadow-xs hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-chobee-navy-700 border-t-transparent rounded-full animate-spin" />
                  <span>Connecting to Google...</span>
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-slate-200/80 w-full" />
              <span className="bg-white/95 px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider absolute backdrop-blur-xs">
                or with email
              </span>
            </div>
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
