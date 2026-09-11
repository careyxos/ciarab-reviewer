import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Zap, 
  Activity, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  RotateCcw, 
  Edit, 
  Ban, 
  Check, 
  Crown, 
  Sparkles, 
  Download, 
  Calendar, 
  UserCheck, 
  Plus,
  Radio,
  Smartphone,
  Laptop,
  Tablet,
  Clock,
  Bell,
  X,
  Layers,
  HelpCircle,
  FileText,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/apiClient';
import { playHapticTap } from '../services/audioService';
import { fireLightCelebration } from '../services/fxService';
import { 
  subscribeToAdminPresence, 
  computeUserPresence, 
  PresenceSession, 
  AggregatedUserPresence 
} from '../services/presenceService';
import { getSupabase, isSupabaseConfigured } from '../services/supabaseClient';

interface AdminDashboardProps {
  onBackToDashboard: () => void;
  soundEnabled?: boolean;
}

export interface AdminUserItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  plan?: string;
  dailyTokenLimit: number;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  lastLogin?: string;
  lastSeenAt?: string;
  isDisabled: boolean;
  todayUsage?: {
    used: number;
    remaining: number;
  };
  aiStats?: {
    flashcards: number;
    quizzes: number;
    summaries: number;
    chats: number;
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onBackToDashboard,
  soundEnabled = true,
}) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<{
    totalUsers: number;
    activeUsersToday: number;
    aiRequestsToday: number;
    totalTokensConsumedToday: number;
    mostUsedFeature: string;
  }>({
    totalUsers: 1,
    activeUsersToday: 1,
    aiRequestsToday: 0,
    totalTokensConsumedToday: 0,
    mostUsedFeature: 'flashcards',
  });

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'recent' | 'offline'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTokenLimit, setEditTokenLimit] = useState<number>(100);

  // Selected User Modal State
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<AdminUserItem | null>(null);

  // Live Multi-Device Presence Map
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceSession[]>>(new Map());

  // Real-time notification toast
  const [newUserNotification, setNewUserNotification] = useState<{
    name: string;
    email: string;
    time: string;
  } | null>(null);

  const fetchAdminData = async () => {
    setIsLoading(true);

    // 1. Direct Supabase Query first
    const supabase = getSupabase();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: dbProfiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(dbProfiles) && dbProfiles.length > 0) {
          const today = new Date().toISOString().split('T')[0];
          const { data: usages } = await supabase
            .from('daily_usage')
            .select('*')
            .eq('date', today);

          const usageMap = new Map((usages || []).map((u: any) => [u.user_id, u]));

          const mapped: AdminUserItem[] = dbProfiles.map((p) => {
            const uUsage = usageMap.get(p.id);
            return {
              id: p.id,
              email: p.email,
              displayName: p.display_name,
              role: p.role,
              plan: p.plan || 'free',
              dailyTokenLimit: p.daily_token_limit || 100,
              referralCode: p.referral_code,
              referredBy: p.referred_by,
              createdAt: p.created_at,
              lastLogin: p.last_login_at,
              lastSeenAt: p.last_seen_at,
              isDisabled: Boolean(p.is_disabled),
              todayUsage: {
                used: uUsage?.tokens_used || 0,
                remaining: uUsage?.tokens_remaining ?? (p.daily_token_limit || 100),
              },
            };
          });

          setUsers(mapped);
          setMetrics({
            totalUsers: mapped.length,
            activeUsersToday: mapped.filter((u) => u.lastLogin && u.lastLogin.startsWith(today)).length,
            aiRequestsToday: 0,
            totalTokensConsumedToday: mapped.reduce((acc, u) => acc + (u.todayUsage?.used || 0), 0),
            mostUsedFeature: 'flashcards',
          });
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase direct admin fetch error:', err);
      }
    }

    // 2. Serverless API Endpoint Fallback
    try {
      const [metricsRes, usersRes] = await Promise.all([
        apiRequest<{ metrics: any }>('/api/admin/metrics'),
        apiRequest<{ users: AdminUserItem[] }>('/api/admin/users'),
      ]);

      if (metricsRes?.metrics) setMetrics(metricsRes.metrics);
      if (usersRes?.users) setUsers(usersRes.users);
    } catch (err) {
      console.warn('Admin API fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Subscribe to Realtime Presence Channel
  useEffect(() => {
    const unsubscribe = subscribeToAdminPresence((newMap) => {
      setPresenceMap(new Map(newMap));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time Database Event Subscription (New Signups & Usage Updates via WebSocket)
  useEffect(() => {
    const supabase = getSupabase();
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('admin-realtime-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload: any) => {
          if (payload.new) {
            const newP = payload.new;
            const newUserItem: AdminUserItem = {
              id: newP.id,
              email: newP.email,
              displayName: newP.display_name,
              role: newP.role,
              plan: newP.plan || 'free',
              dailyTokenLimit: newP.daily_token_limit || 100,
              referralCode: newP.referral_code,
              referredBy: newP.referred_by,
              createdAt: newP.created_at,
              lastLogin: newP.last_login_at,
              lastSeenAt: newP.last_seen_at,
              isDisabled: Boolean(newP.is_disabled),
              todayUsage: { used: 0, remaining: newP.daily_token_limit || 100 },
            };

            setUsers((prev) => [newUserItem, ...prev.filter((u) => u.id !== newUserItem.id)]);
            setMetrics((prev) => ({ ...prev, totalUsers: prev.totalUsers + 1 }));

            // Trigger Real-Time Notification & Confetti
            setNewUserNotification({
              name: newUserItem.displayName,
              email: newUserItem.email,
              time: 'Just now',
            });
            fireLightCelebration(0.5, 0.6);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload: any) => {
          if (payload.new) {
            const upd = payload.new;
            setUsers((prev) =>
              prev.map((u) =>
                u.id === upd.id
                  ? {
                      ...u,
                      displayName: upd.display_name,
                      role: upd.role,
                      plan: upd.plan,
                      dailyTokenLimit: upd.daily_token_limit,
                      isDisabled: Boolean(upd.is_disabled),
                      lastSeenAt: upd.last_seen_at,
                    }
                  : u
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch (e) {}
    };
  }, []);

  const handleToggleDisable = async (targetUser: AdminUserItem) => {
    if (soundEnabled) playHapticTap();
    const newStatus = !targetUser.isDisabled;
    try {
      await apiRequest('/api/admin/update', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: targetUser.id,
          isDisabled: newStatus,
        }),
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isDisabled: newStatus } : u))
      );
      if (selectedUserForDetails?.id === targetUser.id) {
        setSelectedUserForDetails((prev) => (prev ? { ...prev, isDisabled: newStatus } : null));
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to update user status');
    }
  };

  const handleSaveTokenLimit = async (targetUserId: string) => {
    if (soundEnabled) playHapticTap();
    try {
      await apiRequest('/api/admin/update', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId,
          dailyTokenLimit: editTokenLimit,
        }),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                dailyTokenLimit: editTokenLimit,
                todayUsage: {
                  used: u.todayUsage?.used || 0,
                  remaining: Math.max(0, editTokenLimit - (u.todayUsage?.used || 0)),
                },
              }
            : u
        )
      );
      if (selectedUserForDetails?.id === targetUserId) {
        setSelectedUserForDetails((prev) =>
          prev
            ? {
                ...prev,
                dailyTokenLimit: editTokenLimit,
                todayUsage: {
                  used: prev.todayUsage?.used || 0,
                  remaining: Math.max(0, editTokenLimit - (prev.todayUsage?.used || 0)),
                },
              }
            : null
        );
      }
      setEditingUserId(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to update token limit');
    }
  };

  const handleRoleChange = async (targetUser: AdminUserItem, newRole: string) => {
    if (soundEnabled) playHapticTap();
    const tokenLimit = newRole === 'admin' ? 999999 : newRole === 'premium' ? 500 : 100;
    try {
      await apiRequest('/api/admin/update', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId: targetUser.id,
          role: newRole,
          dailyTokenLimit: tokenLimit,
        }),
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                role: newRole,
                dailyTokenLimit: tokenLimit,
                todayUsage: {
                  used: u.todayUsage?.used || 0,
                  remaining: Math.max(0, tokenLimit - (u.todayUsage?.used || 0)),
                },
              }
            : u
        )
      );
      if (selectedUserForDetails?.id === targetUser.id) {
        setSelectedUserForDetails((prev) =>
          prev
            ? {
                ...prev,
                role: newRole,
                dailyTokenLimit: tokenLimit,
              }
            : null
        );
      }
    } catch (e: any) {
      alert(e?.message || 'Failed to update user role');
    }
  };

  // Compute live presence for all users
  const usersWithPresence = useMemo(() => {
    return users.map((u) => {
      const liveSessions = presenceMap.get(u.id);
      const presence = computeUserPresence(u.id, liveSessions, u.lastSeenAt || u.lastLogin);
      return {
        ...u,
        presence,
      };
    });
  }, [users, presenceMap]);

  // Online count calculation
  const onlineCount = useMemo(() => {
    return usersWithPresence.filter((u) => u.presence.status === 'online').length;
  }, [usersWithPresence]);

  const recentCount = useMemo(() => {
    return usersWithPresence.filter((u) => u.presence.status === 'recent').length;
  }, [usersWithPresence]);

  const offlineCount = useMemo(() => {
    return usersWithPresence.filter((u) => u.presence.status === 'offline').length;
  }, [usersWithPresence]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return usersWithPresence.filter((u) => {
      const matchesSearch =
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.referralCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (statusFilter === 'online') return u.presence.status === 'online';
      if (statusFilter === 'recent') return u.presence.status === 'recent';
      if (statusFilter === 'offline') return u.presence.status === 'offline';
      return true;
    });
  }, [usersWithPresence, searchQuery, statusFilter]);

  const exportUsersCSV = () => {
    if (soundEnabled) playHapticTap();
    const headers = [
      'Name',
      'Email',
      'Status',
      'Role',
      'Daily Limit',
      'Tokens Used Today',
      'Tokens Remaining',
      'Referral Code',
      'Account Disabled',
      'Registered At'
    ];
    const rows = filteredUsers.map((u) => [
      `"${u.displayName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.presence.status,
      u.role,
      u.dailyTokenLimit,
      u.todayUsage?.used || 0,
      u.todayUsage?.remaining ?? u.dailyTokenLimit,
      u.referralCode,
      u.isDisabled ? 'Yes' : 'No',
      u.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chobee_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-4 animate-fadeIn">
      {/* Real-time New User Registration Banner */}
      {newUserNotification && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-sm">🔔 New User Registered Online!</p>
              <p className="text-xs text-emerald-100">
                <span className="font-bold text-white">{newUserNotification.name}</span> ({newUserNotification.email}) just created an account.
              </p>
            </div>
          </div>
          <button
            onClick={() => setNewUserNotification(null)}
            className="p-1 rounded-lg hover:bg-white/20 text-emerald-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              onBackToDashboard();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 hover:bg-white text-xs font-bold text-chobee-navy-900 border border-slate-200/80 shadow-xs transition-all mb-2"
          >
            <ArrowLeft className="w-4 h-4 text-chobee-pink-500" />
            <span>Back to Study Platform</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-chobee-navy-950 font-display">
                Chobee Live Admin Console 👑
              </h1>
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                <span>Real-Time Cloud Platform Monitoring</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-600 font-bold">WebSocket Connected</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              fetchAdminData();
            }}
            className="p-2.5 rounded-2xl bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80 shadow-xs"
            title="Refresh Users"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={exportUsersCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/80 hover:bg-white text-xs font-bold text-chobee-navy-900 border border-slate-200/80 shadow-xs"
          >
            <Download className="w-4 h-4 text-chobee-blue-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-3xl border border-white/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-chobee-pink-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
              Total Users
            </span>
            <span className="text-2xl font-black text-chobee-navy-950 font-display">
              {users.length}
            </span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-white/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 relative">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
              Online Now
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-emerald-600 font-display">
                {onlineCount}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                ({recentCount} recent)
              </span>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-white/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-chobee-blue-600 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
              AI Requests Today
            </span>
            <span className="text-2xl font-black text-chobee-navy-950 font-display">
              {metrics.aiRequestsToday}
            </span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-white/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase text-slate-400 block tracking-wider">
              Tokens Consumed
            </span>
            <span className="text-2xl font-black text-chobee-navy-950 font-display">
              {metrics.totalTokensConsumedToday}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/70 border border-slate-200/80 rounded-2xl shadow-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'all'
                ? 'bg-chobee-navy-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-chobee-navy-900'
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setStatusFilter('online')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'online'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online ({onlineCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('recent')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'recent'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-700 hover:bg-amber-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Recent ({recentCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('offline')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'offline'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-slate-300" />
            <span>Offline ({offlineCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, referral..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/80 border border-slate-200/90 rounded-2xl text-xs font-semibold text-chobee-navy-900 focus:outline-none focus:ring-2 focus:ring-chobee-pink-400 shadow-xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-3xl border border-white/80 shadow-glow-dual overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Status & Presence</th>
                <th className="px-5 py-4">Role / Plan</th>
                <th className="px-5 py-4">Daily Tokens</th>
                <th className="px-5 py-4">Joined</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No users matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUserAdmin = u.role === 'admin';
                  const isEditing = editingUserId === u.id;
                  const presence = u.presence;

                  return (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUserForDetails(u)}
                      className="hover:bg-pink-50/30 transition-colors cursor-pointer"
                    >
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-400 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-chobee-navy-950 flex items-center gap-1.5">
                              <span>{u.displayName}</span>
                              {isUserAdmin && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Live Status */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black">
                          {presence.status === 'online' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              <span>{presence.statusText}</span>
                            </span>
                          ) : presence.status === 'recent' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              <span className="w-2 h-2 rounded-full bg-amber-500" />
                              <span>{presence.statusText}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span>{presence.statusText}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-chobee-navy-900"
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      {/* Daily Tokens */}
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="999999"
                              value={editTokenLimit}
                              onChange={(e) => setEditTokenLimit(Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-white border border-pink-300 rounded-lg text-xs font-mono font-bold"
                            />
                            <button
                              onClick={() => handleSaveTokenLimit(u.id)}
                              className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-chobee-navy-900">
                              {isUserAdmin ? 'Unlimited' : `${u.todayUsage?.remaining ?? u.dailyTokenLimit} / ${u.dailyTokenLimit}`}
                            </span>
                            {!isUserAdmin && (
                              <button
                                onClick={() => {
                                  setEditingUserId(u.id);
                                  setEditTokenLimit(u.dailyTokenLimit);
                                }}
                                className="text-slate-400 hover:text-chobee-navy-900"
                                title="Edit token limit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleToggleDisable(u)}
                            className={`p-1.5 rounded-xl border transition-all ${
                              u.isDisabled
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100'
                            }`}
                            title={u.isDisabled ? 'Re-enable Account' : 'Disable Account'}
                          >
                            {u.isDisabled ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER DETAILS MODAL */}
      {selectedUserForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-chobee-navy-950/40 backdrop-blur-sm animate-fadeIn">
          <div className="glass-panel w-full max-w-xl rounded-[32px] p-6 sm:p-8 border-2 border-white/90 shadow-glow-dual space-y-6 bg-white/95 relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setSelectedUserForDetails(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-chobee-navy-900"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-400 to-purple-500 text-white text-xl font-black flex items-center justify-center shadow-md">
                {selectedUserForDetails.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-chobee-navy-950 font-display flex items-center gap-2">
                  <span>{selectedUserForDetails.displayName}</span>
                  {selectedUserForDetails.role === 'admin' && <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedUserForDetails.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedUserForDetails.isDisabled
                      ? 'bg-red-100 text-red-600'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {selectedUserForDetails.isDisabled ? 'Account Disabled' : 'Account Active'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                    Plan: {selectedUserForDetails.plan || selectedUserForDetails.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Presence & Device Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Live Presence:</span>
                <span className="font-extrabold text-chobee-navy-900">
                  {computeUserPresence(
                    selectedUserForDetails.id,
                    presenceMap.get(selectedUserForDetails.id),
                    selectedUserForDetails.lastSeenAt || selectedUserForDetails.lastLogin
                  ).statusText}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Last Login:</span>
                <span className="font-mono text-slate-700">
                  {selectedUserForDetails.lastLogin ? new Date(selectedUserForDetails.lastLogin).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Registered On:</span>
                <span className="font-mono text-slate-700">
                  {new Date(selectedUserForDetails.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500">Referral Code:</span>
                <span className="font-mono font-bold text-chobee-pink-600">
                  {selectedUserForDetails.referralCode}
                </span>
              </div>
            </div>

            {/* Active Connected Sessions (Multi-Device) */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Laptop className="w-3.5 h-3.5" />
                <span>Connected Devices & Sessions</span>
              </h4>
              {presenceMap.get(selectedUserForDetails.id)?.length ? (
                <div className="space-y-2">
                  {presenceMap.get(selectedUserForDetails.id)!.map((s, idx) => (
                    <div
                      key={s.sessionId || idx}
                      className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {s.deviceType === 'Mobile' ? (
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                        ) : s.deviceType === 'Tablet' ? (
                          <Tablet className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Laptop className="w-4 h-4 text-emerald-600" />
                        )}
                        <div>
                          <p className="font-bold text-emerald-950">{s.browserInfo}</p>
                          <p className="text-[10px] text-emerald-600 font-mono">Session ID: {s.sessionId}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-800 text-[10px] font-black">
                        🟢 Active Now
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  No devices currently active. User will show online here when they open the site on phone, laptop, or PC.
                </p>
              )}
            </div>

            {/* Token Quota Editor */}
            <div className="p-4 rounded-2xl bg-pink-50/60 border border-pink-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-chobee-navy-950">Daily AI Study Credits</span>
                <span className="text-xs font-mono font-bold text-chobee-pink-600">
                  {selectedUserForDetails.role === 'admin' ? 'Unlimited' : `${selectedUserForDetails.dailyTokenLimit} credits/day`}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[100, 250, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      setEditTokenLimit(amt);
                      handleSaveTokenLimit(selectedUserForDetails.id);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${
                      selectedUserForDetails.dailyTokenLimit === amt
                        ? 'bg-chobee-pink-500 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-pink-100 border border-pink-200'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedUserForDetails(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => handleToggleDisable(selectedUserForDetails)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xs ${
                  selectedUserForDetails.isDisabled
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {selectedUserForDetails.isDisabled ? 'Re-enable Account' : 'Disable Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
