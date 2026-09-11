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
  Sparkles,
  Download,
  Calendar,
  UserCheck,
  Plus
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
    } catch (e: any) {
      alert(e?.message || 'Failed to update user role');
    }
  };

  const exportUsersCSV = () => {
    if (soundEnabled) playHapticTap();
    const headers = ['Name', 'Email', 'Role', 'Daily Limit', 'Tokens Used Today', 'Tokens Remaining', 'Referral Code', 'Referred By', 'Status', 'Registered At'];
    const rows = users.map((u) => [
      `"${u.displayName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.role,
      u.dailyTokenLimit,
      u.todayUsage?.used || 0,
      u.todayUsage?.remaining || u.dailyTokenLimit,
      u.referralCode,
      `"${u.referredBy || 'None'}"`,
      u.isDisabled ? 'Disabled' : 'Active',
      `"${new Date(u.createdAt).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chobee-users-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportUsersJSON = () => {
    if (soundEnabled) playHapticTap();
    const blob = new Blob([JSON.stringify(users, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chobee-users-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h2 className="text-base font-black text-chobee-navy-900 font-display flex items-center gap-2">
              <span>User Directory & Token Control</span>
              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[11px] font-bold">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Manage registered accounts, promote your girlfriend to Admin/Unlimited, or download the full user list.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 bg-white/90 text-xs font-semibold text-chobee-navy-900 focus:outline-none focus:border-chobee-pink-400"
              />
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={exportUsersCSV}
                title="Download user list as CSV for Excel / Google Sheets"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 shadow-2xs transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={exportUsersJSON}
                title="Download raw user database as JSON"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* GF Admin Quick Tip */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50/90 via-purple-50/90 to-blue-50/90 border border-pink-200/80 flex items-start gap-3 text-xs">
          <Sparkles className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
          <div className="text-chobee-navy-950 leading-relaxed">
            <strong className="font-bold text-pink-700">Paano gawing Unlimited Admin si Mayor Cia:</strong> Hanapin ang pangalan o email niya sa table sa ibaba, at i-click ang dropdown sa tapat ng <span className="font-bold font-mono">Role</span> para gawing <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-black text-[10px]">👑 ADMIN</span>. Awtomatiko siyang magkakaroon ng <strong>999,999 Tokens (Unlimited)</strong>!
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
                  <th className="py-2.5 px-3">Signed Up</th>
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
                      <div className="font-bold text-chobee-navy-900 flex items-center gap-1.5">
                        <span>{u.displayName}</span>
                        {u.role === 'admin' && (
                          <span title="Administrator">👑</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer focus:outline-none ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 border-purple-300 font-black'
                            : u.role === 'premium'
                            ? 'bg-amber-100 text-amber-700 border-amber-300 font-black'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Click to promote or change role"
                      >
                        <option value="free">🌱 Free (100 tokens/day)</option>
                        <option value="premium">🌟 Premium (500 tokens/day)</option>
                        <option value="admin">👑 Admin (Unlimited tokens)</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
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
                          <span>{u.role === 'admin' ? 'Unlimited (∞)' : u.dailyTokenLimit}</span>
                          {u.role !== 'admin' && (
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
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {u.role === 'admin' ? (
                        <span className="text-purple-600 font-bold text-[11px]">Unlimited</span>
                      ) : u.todayUsage ? (
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
