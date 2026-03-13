/**
 * Frontend API Service
 * Bu fayl frontend (React) tomonida ishlatiladi.
 * Faylni: src/services/api.service.ts ga qo'ying
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Token management ─────────────────────────────────────────────────────────

let accessToken: string | null = localStorage.getItem('accessToken');
let refreshToken: string | null = localStorage.getItem('refreshToken');

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function getAccessToken() {
  return accessToken;
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: any,
  isFormData = false,
): Promise<T> {
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh if 401
  if (res.status === 401 && refreshToken && path !== '/auth/refresh') {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request(method, path, body, isFormData);
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session tugadi');
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || `HTTP ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
  }

  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const data = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then((r) => r.json());

    if (data.accessToken) {
      setTokens(data.accessToken, data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  // Google OAuth — redirect to backend
  googleLogin() {
    window.location.href = `${BASE_URL}/auth/google`;
  },

  // Handle Google callback (token from URL params)
  handleGoogleCallback() {
    const params = new URLSearchParams(window.location.search);
    const access = params.get('accessToken');
    const refresh = params.get('refreshToken');
    const needsNickname = params.get('needsNickname') === 'true';
    if (access && refresh) {
      setTokens(access, refresh);
    }
    return { needsNickname };
  },

  // Send OTP
  sendOtp(phoneNumber: string) {
    return request<{ message: string; expiresIn: number }>(
      'POST', '/auth/phone/send', { phoneNumber }
    );
  },

  // Verify OTP
  verifyOtp(phoneNumber: string, code: string) {
    return request<{
      accessToken: string;
      refreshToken: string;
      needsNickname: boolean;
      user: UserData;
    }>('POST', '/auth/phone/verify', { phoneNumber, code });
  },

  // Set nickname after first login
  setNickname(nickname: string) {
    return request<{ accessToken: string; refreshToken: string; user: UserData }>(
      'POST', '/auth/set-nickname', { nickname }
    );
  },

  // Get current user
  me() {
    return request<UserData>('GET', '/auth/me');
  },

  // Logout
  logout() {
    return request<{ message: string }>('POST', '/auth/logout').finally(clearTokens);
  },

  // Refresh tokens
  refresh() {
    return tryRefresh();
  },
};

// ─── Users API ────────────────────────────────────────────────────────────────

export const usersApi = {
  getMe() {
    return request<UserData>('GET', '/users/me');
  },

  updateProfile(data: { nickname?: string }) {
    return request<UserData>('PUT', '/users/me', data);
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>(
      'PUT', '/users/me/password', { currentPassword, newPassword }
    );
  },

  uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return request<UserData>('PUT', '/users/me/avatar', formData, true);
  },

  checkNickname(nickname: string) {
    return request<{ available: boolean }>(
      'POST', '/users/check-nickname', { nickname }
    );
  },

  getPublicProfile(nickname: string) {
    return request<UserData>('GET', `/users/${nickname}`);
  },
};

// ─── Rooms API ────────────────────────────────────────────────────────────────

export const roomsApi = {
  createRoom(data: {
    durationMinutes: 5 | 10 | 15;
    maxPlayers?: number;
    wordCategory?: string;
  }) {
    return request<RoomData>('POST', '/rooms', data);
  },

  joinRoom(roomCode: string) {
    return request<RoomData>('POST', '/rooms/join', { roomCode });
  },

  getRoomByCode(code: string) {
    return request<RoomData>('GET', `/rooms/${code}`);
  },

  invitePlayer(roomId: string, nickname: string) {
    return request<{ message: string }>('POST', `/rooms/${roomId}/invite`, { nickname });
  },

  leaveRoom(roomId: string) {
    return request<{ message: string }>('DELETE', `/rooms/${roomId}/leave`);
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserData {
  id: string;
  nickname: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gamesPlayed: number;
  wins: number;
  timesImposter: number;
  imposterWins: number;
  createdAt?: string;
  lastSeen?: string;
  needsNickname?: boolean;
}

export interface RoomData {
  id: string;
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'voting' | 'ended';
  durationMinutes: number;
  maxPlayers: number;
  players: PlayerData[];
  createdAt: string;
}

export interface PlayerData {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  isHost: boolean;
  isConnected: boolean;
  turnOrder: number;
}
