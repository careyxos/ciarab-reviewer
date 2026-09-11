import React, { useState, useEffect } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../services/apiClient';
import { playHapticTap } from '../services/audioService';

interface AdminDashboardProps {
  onBackToDashboard: () => void;
  soundEnabled?: boolean;
}

interface AdminUserItem {
  id: string;
  email: string;
  displayName: string;
  role: string;
  dailyTokenLimit: number;
  referralCode: string;
  referredBy?: string;
  createdAt: string;
  lastLogin?: string;
  isDisabled: boolean;
  todayUsage?: {
    used: number;
    remaining: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editTokenLimit, setEditTokenLimit] = useState<number>(100);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, usersRes] = await Promise.all([
        apiRequest<{ metrics: any }>('/api/admin/metrics'),
        apiRequest<{ users: AdminUserItem[] }>('/api/admin/users'),
      ]);

      if (metricsRes?.metrics) setMetrics(metricsRes.metrics);
      if (usersRes?.users) setUsers(usersRes.users);
    } catch (err) {
      console.warn('Admin fetch error, showing local admin view:', err);
      // Fallback local admin data if serverless is in dev mode
      if (user) {
        setUsers([
          {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            dailyTokenLimit: user.dailyTokenLimit,
            referralCode: user.referralCode,
            createdAt: user.createdAt,
            isDisabled: false,
            todayUsage: { used: 15, remaining: 85 },
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
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
      setEditingUserId(null);
    } catch (e: any) {
      alert(e?.message || 'Failed to update token limit');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      u.referralCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (soundEnabled) playHapticTap();
            onBackToDashboard();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/80 hover:bg-white text-xs font-bold text-chobee-navy-900 border border-slate-200/80 shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-chobee-pink-500" />
          <span>Back to Study Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 border border-purple-200 text-purple-700 text-xs font-black">
            <Crown className="w-3.5 h-3.5" />
            <span>Admin Console</span>
          </div>

          <button
            onClick={() => {
              if (soundEnabled) playHapticTap();
              fetchAdminData();
            }}
            className="p-2 rounded-xl bg-white/70 hover:bg-white text-slate-500 hover:text-chobee-navy-900 border border-slate-200/80"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-chobee-pink-500" />
          </div>
          <div className="text-2xl font-black text-chobee-navy-950 font-display">
            {metrics.totalUsers}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Registered accounts</div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Today</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-chobee-navy-950 font-display">
            {metrics.activeUsersToday}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Logged in / studying</div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">AI Requests</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-chobee-navy-950 font-display">
            {metrics.aiRequestsToday}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Generations today</div>
        </div>

        <div className="glass-panel p-4 sm:p-5 rounded-3xl border border-white/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tokens Consumed</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-chobee-navy-950 font-display">
            {metrics.totalTokensConsumedToday}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Most used: {metrics.mostUsedFeature}</div>
        </div>
      </div>

      {/* User Directory */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-chobee-navy-900 font-display">
              User Directory & Token Control
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Manage accounts, adjust daily token allowances, and inspect activity.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs font-bold text-slate-400">
            Loading user list...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-xs font-semibold text-slate-400">
            No users found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Daily Limit</th>
                  <th className="py-2.5 px-3">Today Status</th>
                  <th className="py-2.5 px-3">Referral Code</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-chobee-navy-900">{u.displayName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        u.role === 'admin' 
                          ? 'bg-purple-100 text-purple-700'
                          : u.role === 'premium'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editTokenLimit}
                            onChange={(e) => setEditTokenLimit(Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 rounded border border-chobee-pink-400 font-bold text-xs"
                          />
                          <button
                            onClick={() => handleSaveTokenLimit(u.id)}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 font-bold font-mono">
                          <span>{u.dailyTokenLimit}</span>
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditTokenLimit(u.dailyTokenLimit);
                            }}
                            className="text-slate-400 hover:text-chobee-pink-600"
                            title="Edit daily limit"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {u.todayUsage ? (
                        <span className="font-bold">
                          {u.todayUsage.remaining} left / {u.todayUsage.used} used
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {u.referralCode}
                      {u.referredBy && <span className="block text-[10px] text-pink-500">ref: {u.referredBy}</span>}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleDisable(u)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                          u.isDisabled
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {u.isDisabled ? 'Disabled' : 'Active'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
