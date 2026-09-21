import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, DailyUsageState } from '../types/auth';
import { 
  getStoredToken, 
  setStoredToken, 
  getStoredUser,
  setStoredUser,
  clearStoredAuth, 
  apiRequest, 
  getLocalMockUser, 
  saveLocalMockUser 
} from '../services/apiClient';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';
import { startPresenceTracking, stopPresenceTracking } from '../services/presenceService';

interface AuthContextType {
  user: UserProfile | null;
  dailyUsage: DailyUsageState;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'signup' | 'reset';
  referralQueryCode: string | null;
  openAuthModal: (mode?: 'login' | 'signup' | 'reset') => void;
  closeAuthModal: () => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string, refCode?: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string, newPass: string) => Promise<string>;
  updateProfile: (name: string) => Promise<void>;
  refreshUsage: () => Promise<void>;
  updateUsageRemaining: (remaining: number, used?: number) => void;
}

const DEFAULT_USAGE: DailyUsageState = {
  allocated: 100,
  used: 0,
  remaining: 100,
  resetCountdown: '24h 00m',
};

const ADMIN_WHITELIST = [
  'careysison21@gmail.com',
  'ciarabernadette12@gmail.com',
  'carey@chobee.app',
  ...(import.meta.env.VITE_ADMIN_EMAIL ? (import.meta.env.VITE_ADMIN_EMAIL as string).toLowerCase().split(',').map((e: string) => e.trim()) : [])
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => getStoredUser());
  const [dailyUsage, setDailyUsage] = useState<DailyUsageState>(DEFAULT_USAGE);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [referralQueryCode, setReferralQueryCode] = useState<string | null>(null);

  // Check URL parameters for referral code e.g. ?ref=CHOBEE-7X92K
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        setReferralQueryCode(ref.toUpperCase().trim());
      }
    }
  }, []);

  // Check initial session (Supabase Auth first, then Serverless fallback)
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      const cached = getStoredUser();

      // Fast hydration from cache
      if (cached) {
        setUser(cached);
        const limit = cached.role === 'admin' ? 999999 : (cached.dailyTokenLimit || 100);
        setDailyUsage((prev) => ({
          ...prev,
          allocated: limit,
          remaining: limit,
        }));
      }

      // Check Supabase Auth if configured
      const supabase = getSupabase();
      if (isSupabaseConfigured() && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const authUser = session.user;
            // Fetch profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .single();

            const isUserAdmin = profile?.role === 'admin' || ADMIN_WHITELIST.includes(authUser.email?.toLowerCase() || '');
            const userProfile: UserProfile = {
              id: authUser.id,
              email: authUser.email || '',
              displayName: profile?.display_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Scholar',
              role: isUserAdmin ? 'admin' : (profile?.role || 'free'),
              referralCode: profile?.referral_code || 'CHOBEE-USER',
              referredBy: profile?.referred_by,
              dailyTokenLimit: isUserAdmin ? 999999 : 100,
              createdAt: profile?.created_at || authUser.created_at,
            };

            setUser(userProfile);
            setStoredUser(userProfile);
            if (session.access_token) setStoredToken(session.access_token);

            // Fetch usage
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: usageData } = await supabase
              .from('daily_usage')
              .select('*')
              .eq('user_id', authUser.id)
              .eq('date', todayStr)
              .single();

            if (usageData) {
              const allocated = isUserAdmin ? 999999 : Math.min(100, usageData.tokens_allocated);
              const remaining = isUserAdmin ? 999999 : Math.min(allocated, usageData.tokens_remaining);
              setDailyUsage({
                allocated,
                used: usageData.tokens_used,
                remaining,
                resetCountdown: '00h 00m',
              });
            }

            setIsLoading(false);
            return;
          }
        } catch (supabaseErr) {
          console.warn('Supabase auth session check fallback:', supabaseErr);
        }
      }

      // Serverless fallback verification
      if (!token || !token.includes('.')) {
        if (!cached) {
          clearStoredAuth();
          setUser(null);
        }
        setIsLoading(false);
        return;
      }

      try {
        const data = await apiRequest<{ user: UserProfile; usage: DailyUsageState }>('/api/auth/me');
        setUser(data.user);
        setStoredUser(data.user);
        if (data.usage) {
          const isUserAdmin = data.user.role === 'admin';
          const allocated = isUserAdmin ? 999999 : Math.min(100, data.usage.allocated);
          const remaining = isUserAdmin ? 999999 : Math.min(allocated, data.usage.remaining);
          setDailyUsage({
            ...data.usage,
            allocated,
            remaining,
          });
        }
      } catch (err: any) {
        console.warn('Could not verify server session:', err);
        if (err?.status === 401) {
          clearStoredAuth();
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Multi-Device Presence Tracking: automatically tracks presence when user is logged in
  useEffect(() => {
    if (user?.id) {
      startPresenceTracking({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      });
    } else {
      stopPresenceTracking();
    }

    return () => {
      stopPresenceTracking();
    };
  }, [user?.id]);

  // Real-time listener on daily_usage row in Supabase (Sync token balance across all devices!)
  useEffect(() => {
    const supabase = getSupabase();
    if (!isSupabaseConfigured() || !supabase || !user?.id) return;

    const channel = supabase
      .channel(`daily-usage-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_usage',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new) {
            const isUserAdmin = user.role === 'admin';
            const allocated = isUserAdmin ? 999999 : Math.min(100, payload.new.tokens_allocated);
            const remaining = isUserAdmin ? 999999 : Math.min(allocated, payload.new.tokens_remaining);
            setDailyUsage((prev) => ({
              ...prev,
              allocated,
              used: payload.new.tokens_used,
              remaining,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {}
    };
  }, [user?.id]);

  // Periodic usage countdown update
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      const diffMs = Math.max(0, tomorrow.getTime() - now.getTime());
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const pad = (n: number) => n.toString().padStart(2, '0');
      
      setDailyUsage((prev) => ({
        ...prev,
        resetCountdown: `${pad(hours)}h ${pad(minutes)}m`,
      }));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  const openAuthModal = (mode: 'login' | 'signup' | 'reset' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (email: string, pass: string) => {
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: pass,
        });

        if (error) throw error;

        if (data.user && data.session) {
          const authUser = data.user;
          const isWhitelistedAdmin = ADMIN_WHITELIST.includes(authUser.email?.toLowerCase() || '');

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          const isUserAdmin = isWhitelistedAdmin || profile?.role === 'admin';
          const userProfile: UserProfile = {
            id: authUser.id,
            email: authUser.email || email,
            displayName: profile?.display_name || authUser.user_metadata?.display_name || email.split('@')[0],
            role: isUserAdmin ? 'admin' : (profile?.role || 'free'),
            referralCode: profile?.referral_code || 'CHOBEE-USER',
            referredBy: profile?.referred_by,
            dailyTokenLimit: isUserAdmin ? 999999 : 100,
            createdAt: profile?.created_at || authUser.created_at,
          };

          setStoredToken(data.session.access_token);
          setUser(userProfile);
          setStoredUser(userProfile);

          // Get usage
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: usageData } = await supabase
            .from('daily_usage')
            .select('*')
            .eq('user_id', authUser.id)
            .eq('date', todayStr)
            .single();

          const allocated = isUserAdmin ? 999999 : Math.min(100, usageData?.tokens_allocated || 100);
          const remaining = isUserAdmin ? 999999 : Math.min(allocated, usageData?.tokens_remaining || allocated);
          setDailyUsage({
            allocated,
            used: usageData?.tokens_used || 0,
            remaining,
            resetCountdown: '24h 00m',
          });

          closeAuthModal();
          return;
        }
      } catch (err: any) {
        console.warn('Supabase login error, attempting serverless endpoint:', err?.message);
        // If Supabase failed due to network/configuration, attempt serverless endpoint
      }
    }

    // Serverless backend fallback
    try {
      const data = await apiRequest<{ token: string; user: UserProfile; usage: DailyUsageState }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: pass }),
      });

      setStoredToken(data.token);
      setUser(data.user);
      setStoredUser(data.user);
      if (data.usage) {
        const isUserAdmin = data.user.role === 'admin';
        const allocated = isUserAdmin ? 999999 : Math.min(100, data.usage.allocated);
        const remaining = isUserAdmin ? 999999 : Math.min(allocated, data.usage.remaining);
        setDailyUsage({
          ...data.usage,
          allocated,
          remaining,
        });
      }
      saveLocalMockUser({ user: data.user, usage: data.usage || DEFAULT_USAGE });
      closeAuthModal();
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.status === 404) {
        const mockRole = ADMIN_WHITELIST.includes(email.trim().toLowerCase()) ? 'admin' : 'free';
        const mockUser: UserProfile = {
          id: `local-${Date.now()}`,
          email,
          displayName: email.split('@')[0],
          role: mockRole,
          referralCode: 'CHOBEE-LOCAL',
          dailyTokenLimit: mockRole === 'admin' ? 999999 : 100,
          createdAt: new Date().toISOString(),
        };
        const mockUsage: DailyUsageState = {
          allocated: mockRole === 'admin' ? 999999 : 100,
          used: 0,
          remaining: mockRole === 'admin' ? 999999 : 100,
          resetCountdown: '24h 00m',
        };
        setStoredToken('mock-session-token');
        setUser(mockUser);
        setDailyUsage(mockUsage);
        saveLocalMockUser({ user: mockUser, usage: mockUsage });
        closeAuthModal();
        return;
      }
      throw err;
    }
  };

  const signup = async (email: string, pass: string, name: string, refCode?: string) => {
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: pass,
          options: {
            data: {
              display_name: name.trim(),
              referred_by: refCode || referralQueryCode || null,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          const authUser = data.user;
          const isWhitelistedAdmin = ADMIN_WHITELIST.includes(authUser.email?.toLowerCase() || '');
          const userProfile: UserProfile = {
            id: authUser.id,
            email: authUser.email || email,
            displayName: name.trim() || email.split('@')[0],
            role: isWhitelistedAdmin ? 'admin' : 'free',
            referralCode: 'CHOBEE-USER',
            referredBy: refCode || referralQueryCode || undefined,
            dailyTokenLimit: isWhitelistedAdmin ? 999999 : 100,
            createdAt: new Date().toISOString(),
          };

          if (data.session?.access_token) {
            setStoredToken(data.session.access_token);
          }
          setUser(userProfile);
          setStoredUser(userProfile);
          setDailyUsage({
            allocated: isWhitelistedAdmin ? 999999 : 100,
            used: 0,
            remaining: isWhitelistedAdmin ? 999999 : 100,
            resetCountdown: '24h 00m',
          });
          closeAuthModal();
          return;
        }
      } catch (err: any) {
        console.warn('Supabase signup fallback:', err?.message);
      }
    }

    // Serverless backend fallback
    try {
      const data = await apiRequest<{ token: string; user: UserProfile; usage: DailyUsageState }>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password: pass,
          displayName: name,
          referralCode: refCode || referralQueryCode,
        }),
      });

      setStoredToken(data.token);
      setUser(data.user);
      setStoredUser(data.user);
      if (data.usage) {
        const isUserAdmin = data.user.role === 'admin';
        const allocated = isUserAdmin ? 999999 : Math.min(100, data.usage.allocated);
        const remaining = isUserAdmin ? 999999 : Math.min(allocated, data.usage.remaining);
        setDailyUsage({
          ...data.usage,
          allocated,
          remaining,
        });
      }
      saveLocalMockUser({ user: data.user, usage: data.usage || DEFAULT_USAGE });
      closeAuthModal();
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.status === 404) {
        const mockRole = ADMIN_WHITELIST.includes(email.trim().toLowerCase()) ? 'admin' : 'free';
        const mockUser: UserProfile = {
          id: `local-${Date.now()}`,
          email,
          displayName: name || email.split('@')[0],
          role: mockRole,
          referralCode: 'CHOBEE-LOCAL',
          dailyTokenLimit: mockRole === 'admin' ? 999999 : 100,
          createdAt: new Date().toISOString(),
        };
        const mockUsage: DailyUsageState = {
          allocated: mockRole === 'admin' ? 999999 : 100,
          used: 0,
          remaining: mockRole === 'admin' ? 999999 : 100,
          resetCountdown: '24h 00m',
        };
        setStoredToken('mock-session-token');
        setUser(mockUser);
        setDailyUsage(mockUsage);
        saveLocalMockUser({ user: mockUser, usage: mockUsage });
        closeAuthModal();
        return;
      }
      throw err;
    }
  };

  const logout = () => {
    stopPresenceTracking();
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    clearStoredAuth();
    localStorage.removeItem('chobee_local_mock_user');
    setUser(null);
    setDailyUsage(DEFAULT_USAGE);
  };

  const resetPassword = async (email: string, newPass: string): Promise<string> => {
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
        if (error) throw error;
        return 'Password reset link sent to your email!';
      } catch (err) {
        console.warn('Supabase password reset fallback:', err);
      }
    }

    const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword: newPass }),
    });
    return data.message;
  };

  const updateProfile = async (displayName: string) => {
    if (!user) return;

    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ display_name: displayName.trim() })
          .eq('id', user.id);
      } catch (e) {}
    }

    const data = await apiRequest<{ user: UserProfile }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName }),
    });
    setUser(data.user);
    setStoredUser(data.user);
    const mock = getLocalMockUser();
    if (mock) {
      saveLocalMockUser({ user: data.user, usage: dailyUsage });
    }
  };

  const refreshUsage = async () => {
    try {
      const data = await apiRequest<{ today: { allocated: number; used: number; remaining: number } }>('/api/usage');
      if (data?.today) {
        const isUserAdmin = user?.role === 'admin';
        const allocated = isUserAdmin ? 999999 : Math.min(100, data.today.allocated);
        const remaining = isUserAdmin ? 999999 : Math.min(allocated, data.today.remaining);
        setDailyUsage((prev) => ({
          ...prev,
          allocated,
          used: data.today.used,
          remaining,
        }));
      }
    } catch (e) {}
  };

  const updateUsageRemaining = (remaining: number, used?: number) => {
    setDailyUsage((prev) => {
      const isUserAdmin = user?.role === 'admin';
      const cap = isUserAdmin ? 999999 : 100;
      const safeRemaining = Math.min(cap, Math.max(0, remaining));
      const updated = {
        ...prev,
        allocated: Math.min(cap, prev.allocated),
        remaining: safeRemaining,
        used: used !== undefined ? used : Math.max(0, prev.allocated - safeRemaining),
      };
      if (user) {
        saveLocalMockUser({ user, usage: updated });
      }
      return updated;
    });
  };

  const isLoggedIn = Boolean(user);
  const isAdmin = user?.role === 'admin' || Boolean(user?.email && ADMIN_WHITELIST.includes(user.email.toLowerCase().trim()));

  return (
    <AuthContext.Provider
      value={{
        user,
        dailyUsage,
        isLoggedIn,
        isAdmin,
        isLoading,
        isAuthModalOpen,
        authModalMode,
        referralQueryCode,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        logout,
        resetPassword,
        updateProfile,
        refreshUsage,
        updateUsageRemaining,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
