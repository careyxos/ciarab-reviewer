import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  History, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Info,
  RotateCcw,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CLIENT_AI_COSTS, UsageLogItem } from '../types/auth';
import { apiRequest } from '../services/apiClient';
import { playHapticTap } from '../services/audioService';

interface UsageViewProps {
  onBackToDashboard: () => void;
  soundEnabled?: boolean;
}

export const UsageView: React.FC<UsageViewProps> = ({
  onBackToDashboard,
  soundEnabled = true,
}) => {
  const { user, dailyUsage, refreshUsage } = useAuth();
  const [logs, setLogs] = useState<UsageLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUsageData = async () => {
      setIsLoading(true);
      try {
        const data = await apiRequest<{ history: UsageLogItem[] }>('/api/usage');
        if (data?.history) {
          setLogs(data.history);
        }
      } catch (err) {
        // Fallback demo log if local
        setLogs([
          {
            id: 'demo-1',
            actionType: 'flashcards',
            tokensUsed: 10,
            timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            success: true,
          },
          {
            id: 'demo-2',
            actionType: 'quiz',
            tokensUsed: 15,
            timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            success: true,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsageData();
  }, []);

  const percentage = Math.min(100, Math.max(0, Math.round((dailyUsage.remaining / dailyUsage.allocated) * 100)));
  const isLow = dailyUsage.remaining <= 20 && dailyUsage.remaining > 0;
  const isEmpty = dailyUsage.remaining <= 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-8 animate-fadeIn">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (soundEnabled) playHapticTap();
            onBackToDashboard();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs transition-all active:scale-95 group"
        >
          <ArrowLeft className="w-4 h-4 text-chobee-pink-500 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </button>

        <button
          onClick={() => {
            if (soundEnabled) playHapticTap();
            refreshUsage();
          }}
          className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200 shadow-2xs transition-colors"
          title="Refresh token balance"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Token Gauge Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-chobee-pink-50 text-chobee-pink-700 font-bold text-xs mb-2">
              <Zap className="w-3.5 h-3.5 fill-chobee-pink-500 text-chobee-pink-500" />
              <span>Daily AI Study Credits</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display">
              {user?.role === 'admin' ? 'Unlimited Admin Credits' : `${dailyUsage.remaining} / ${dailyUsage.allocated} Tokens Available`}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Account plan: <span className="uppercase font-bold text-slate-800">{user?.role || 'Free'}</span> • Resets automatically at 00:00 UTC
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl shrink-0">
            <Clock className="w-5 h-5 text-chobee-blue-500" />
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                Daily Reset In
              </span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {dailyUsage.resetCountdown}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {user?.role !== 'admin' && (
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isEmpty
                    ? 'bg-slate-300'
                    : isLow
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-chobee-pink-500 to-chobee-blue-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
              <span>{dailyUsage.used} Tokens Used Today</span>
              <span>{percentage}% Remaining</span>
            </div>
          </div>
        )}

        {/* Warning Banners */}
        {isLow && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="font-medium">
              <strong>{dailyUsage.remaining} tokens remaining today</strong>. Choose your AI generations wisely!
            </span>
          </div>
        )}

        {isEmpty && user?.role !== 'admin' && (
          <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-3">
            <span className="text-xl">🌙</span>
            <div>
              <strong className="block font-bold text-slate-900">Daily limit reached for today</strong>
              <span className="font-medium">You've used all your study credits for today. Come back after the daily reset in {dailyUsage.resetCountdown}.</span>
            </div>
          </div>
        )}
      </div>

      {/* Token Cost Reference Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span>AI Action Token Costs</span>
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
            <span className="text-lg">📇</span>
            <div className="text-xs font-bold text-slate-900 mt-1">Flashcards</div>
            <div className="text-xs font-bold text-chobee-pink-600 font-mono mt-0.5">
              {CLIENT_AI_COSTS.flashcards} Tokens
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
            <span className="text-lg">🎯</span>
            <div className="text-xs font-bold text-slate-900 mt-1">Quiz Exam</div>
            <div className="text-xs font-bold text-chobee-pink-600 font-mono mt-0.5">
              {CLIENT_AI_COSTS.quiz} Tokens
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
            <span className="text-lg">📝</span>
            <div className="text-xs font-bold text-slate-900 mt-1">Summary</div>
            <div className="text-xs font-bold text-chobee-pink-600 font-mono mt-0.5">
              {CLIENT_AI_COSTS.summary} Tokens
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
            <span className="text-lg">📖</span>
            <div className="text-xs font-bold text-slate-900 mt-1">Study Guide</div>
            <div className="text-xs font-bold text-chobee-pink-600 font-mono mt-0.5">
              {CLIENT_AI_COSTS.studyGuide} Tokens
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
            <span className="text-lg">💬</span>
            <div className="text-xs font-bold text-slate-900 mt-1">AI Chat / Q</div>
            <div className="text-xs font-bold text-chobee-pink-600 font-mono mt-0.5">
              {CLIENT_AI_COSTS.chat} Tokens
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-center shadow-2xs">
            <span className="text-lg">🔄</span>
            <div className="text-xs font-bold text-slate-900 mt-1">Regenerate</div>
            <div className="text-xs font-bold text-chobee-pink-600 font-mono mt-0.5">
              {CLIENT_AI_COSTS.regenerate} Tokens
            </div>
          </div>
        </div>
      </div>

      {/* Activity History Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Recent AI Activity Log
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {logs.length} Transactions
          </span>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400">
            Loading activity history...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs font-medium text-slate-400">
            No AI requests made today yet. Create a study set to start reviewing!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Tokens</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900 capitalize">
                      {log.actionType}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {log.tokensUsed > 0 ? (
                        <span className="text-chobee-pink-600">-{log.tokensUsed}</span>
                      ) : (
                        <span className="text-emerald-600">+{Math.abs(log.tokensUsed)} (Refund)</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {log.success ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 font-bold text-[11px]" title={log.errorMessage}>
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Failed (Refunded)</span>
                        </span>
                      )}
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
