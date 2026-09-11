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

  // Check initial session
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      const cached = getStoredUser();

      if (!token || !token.includes('.')) {
        clearStoredAuth();
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (cached) {
        setUser(cached);
        const limit = cached.role === 'admin' ? 999999 : (cached.dailyTokenLimit || 100);
        setDailyUsage((prev) => ({
          ...prev,
          allocated: limit,
          remaining: limit,
        }));
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
        // Only clear session if explicitly rejected as 401 Unauthorized
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
      // If serverless endpoint is not reachable (pure local preview), support local test accounts
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
    clearStoredAuth();
    localStorage.removeItem('chobee_local_mock_user');
    setUser(null);
    setDailyUsage(DEFAULT_USAGE);
  };

  const resetPassword = async (email: string, newPass: string): Promise<string> => {
    const data = await apiRequest<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, newPassword: newPass }),
    });
    return data.message;
  };

  const updateProfile = async (displayName: string) => {
    if (!user) return;
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
  const isAdmin = user?.role === 'admin';

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
