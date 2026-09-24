import { getSupabase, getDeviceType, getBrowserInfo, getOrCreateSessionId } from './supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceSession {
  userId: string;
  email: string;
  displayName: string;
  deviceType: string;
  browserInfo: string;
  sessionId: string;
  onlineAt: string;
  lastHeartbeat?: string;
}

export type UserPresenceStatus = 'online' | 'recent' | 'offline';

export interface AggregatedUserPresence {
  userId: string;
  status: UserPresenceStatus;
  statusText: string;
  activeSessionsCount: number;
  devices: Array<{
    sessionId: string;
    deviceType: string;
    browserInfo: string;
    onlineAt: string;
  }>;
  lastSeenAt?: string;
}

let activeChannel: RealtimeChannel | null = null;
let heartbeatInterval: any = null;
let currentLocalSession: PresenceSession | null = null;

export const getLocalPresenceSession = (): PresenceSession | null => currentLocalSession;

// ==============================================================================
// CLIENT-SIDE PRESENCE TRACKING (Per Tab / Device)
// ==============================================================================

export const startPresenceTracking = (user: { id: string; email: string; displayName: string }) => {
  const supabase = getSupabase();
  if (!supabase || !user?.id) return;

  // Stop any existing tracking
  stopPresenceTracking();

  const sessionId = getOrCreateSessionId();
  const deviceType = getDeviceType();
  const browserInfo = getBrowserInfo();

  const sessionPayload: PresenceSession = {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    deviceType,
    browserInfo,
    sessionId,
    onlineAt: new Date().toISOString(),
  };

  currentLocalSession = sessionPayload;

  const channel = supabase.channel('chobee-presence-room', {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      // Sync handled by listener
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(sessionPayload);
      }
    });

  activeChannel = channel;

  // Database presence heartbeat function
  const sendDatabaseHeartbeat = async () => {
    try {
      const client = getSupabase();
      if (!client) return;

      // Upsert into user_sessions table
      await client.from('user_sessions').upsert(
        {
          user_id: user.id,
          session_id: sessionId,
          device_type: deviceType,
          browser_info: browserInfo,
          is_active: true,
          last_heartbeat: new Date().toISOString(),
        },
        { onConflict: 'user_id, session_id' }
      );

      // Update profiles last_seen_at and last_login_at
      await client
        .from('profiles')
        .update({ 
          last_seen_at: new Date().toISOString(),
          last_login_at: new Date().toISOString()
        })
        .eq('id', user.id);
    } catch (err) {
      // Heartbeat silent fallback
    }
  };

  // Immediate initial heartbeat
  sendDatabaseHeartbeat();

  // Periodic heartbeat every 25 seconds
  heartbeatInterval = setInterval(sendDatabaseHeartbeat, 25000);

  // Clean up on tab close / reload
  const handleUnload = () => {
    stopPresenceTracking();
  };
  window.addEventListener('beforeunload', handleUnload);
};

export const stopPresenceTracking = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  currentLocalSession = null;

  if (activeChannel) {
    try {
      activeChannel.untrack();
      activeChannel.unsubscribe();
    } catch (e) {}
    activeChannel = null;
  }
};

// ==============================================================================
// ADMIN PRESENCE SUBSCRIBER (Real-time live multi-device monitoring)
// ==============================================================================

export const subscribeToAdminPresence = (
  onPresenceUpdate: (presenceMap: Map<string, PresenceSession[]>) => void
): (() => void) => {
  const supabase = getSupabase();

  const buildAndEmitPresence = (chan?: RealtimeChannel | null) => {
    const presenceMap = new Map<string, PresenceSession[]>();

    // Always include current local user session if active
    if (currentLocalSession) {
      presenceMap.set(currentLocalSession.userId, [currentLocalSession]);
    }

    if (chan) {
      try {
        const state = chan.presenceState<PresenceSession>();
        Object.entries(state).forEach(([userId, sessions]) => {
          if (Array.isArray(sessions) && sessions.length > 0) {
            presenceMap.set(userId, sessions);
          }
        });
      } catch (err) {}
    }

    onPresenceUpdate(presenceMap);
  };

  // Immediate initial emission
  buildAndEmitPresence(activeChannel);

  if (!supabase) return () => {};

  // Connect to the exact same presence room where users track their sessions
  const channel = activeChannel || supabase.channel('chobee-presence-room', {
    config: {
      presence: {
        key: currentLocalSession?.userId || 'admin-dashboard',
      },
    },
  });

  const syncHandler = () => {
    buildAndEmitPresence(channel);
  };

  channel
    .on('presence', { event: 'sync' }, syncHandler)
    .on('presence', { event: 'join' }, syncHandler)
    .on('presence', { event: 'leave' }, syncHandler);

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      buildAndEmitPresence(channel);
    }
  });

  return () => {
    try {
      if (channel !== activeChannel) {
        channel.unsubscribe();
      }
    } catch (e) {}
  };
};

// ==============================================================================
// PRESENCE STATUS CALCULATOR
// ==============================================================================

export const computeUserPresence = (
  userId: string,
  liveSessions: PresenceSession[] | undefined,
  lastSeenAt?: string,
  lastLogin?: string,
  isSelf?: boolean
): AggregatedUserPresence => {
  const activeSessions = liveSessions || [];
  const hasActiveSession = activeSessions.length > 0;

  // 1. If user is currently online via WebSocket sessions OR is the active user on this client
  if (hasActiveSession || isSelf) {
    const sessionCount = Math.max(1, activeSessions.length);
    const nowIso = new Date().toISOString();
    return {
      userId,
      status: 'online',
      statusText: sessionCount > 1 ? `Online (${sessionCount} devices)` : 'Online',
      activeSessionsCount: sessionCount,
      devices: activeSessions.length > 0
        ? activeSessions.map((s) => ({
            sessionId: s.sessionId,
            deviceType: s.deviceType || 'Desktop',
            browserInfo: s.browserInfo || 'Browser',
            onlineAt: s.onlineAt,
          }))
        : [{
            sessionId: 'current-active-session',
            deviceType: getDeviceType(),
            browserInfo: getBrowserInfo(),
            onlineAt: nowIso,
          }],
      lastSeenAt: nowIso,
    };
  }

  // 2. Check latest timestamp (last_seen_at or last_login_at)
  const tSeen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const tLogin = lastLogin ? new Date(lastLogin).getTime() : 0;
  const maxTimestamp = Math.max(tSeen, tLogin);

  if (maxTimestamp > 0 && !isNaN(maxTimestamp)) {
    const effectiveTime = new Date(maxTimestamp).toISOString();
    const diffMs = Math.max(0, Date.now() - maxTimestamp);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    // If heartbeat or login was received within the last 2.5 minutes (heartbeat is sent every 25s),
    // this user is actively online!
    if (diffMs <= 150000) {
      return {
        userId,
        status: 'online',
        statusText: diffMs <= 40000 ? 'Online' : 'Online (Active just now)',
        activeSessionsCount: 1,
        devices: [{
          sessionId: 'recent-heartbeat',
          deviceType: 'Web',
          browserInfo: 'Browser',
          onlineAt: effectiveTime,
        }],
        lastSeenAt: effectiveTime,
      };
    }

    // Between 2.5 minutes and 15 minutes = Recent
    if (diffMinutes <= 15) {
      return {
        userId,
        status: 'recent',
        statusText: `Active ${diffMinutes}m ago`,
        activeSessionsCount: 0,
        devices: [],
        lastSeenAt: effectiveTime,
      };
    }

    // Between 15 minutes and 60 minutes = Offline (minutes)
    if (diffMinutes < 60) {
      return {
        userId,
        status: 'offline',
        statusText: `Offline ${diffMinutes}m ago`,
        activeSessionsCount: 0,
        devices: [],
        lastSeenAt: effectiveTime,
      };
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return {
        userId,
        status: 'offline',
        statusText: `Offline ${diffHours}h ago`,
        activeSessionsCount: 0,
        devices: [],
        lastSeenAt: effectiveTime,
      };
    }

    const diffDays = Math.floor(diffHours / 24);
    return {
      userId,
      status: 'offline',
      statusText: `Offline ${diffDays}d ago`,
      activeSessionsCount: 0,
      devices: [],
      lastSeenAt: effectiveTime,
    };
  }

  return {
    userId,
    status: 'offline',
    statusText: 'Offline',
    activeSessionsCount: 0,
    devices: [],
  };
};
