// src/services/api.ts
const BASE = import.meta.env.VITE_API_URL || '/api'

// ─── Token store ──────────────────────────────────────────────────────────────
export function getAccessToken() { return localStorage.getItem('at') }
export function getRefreshToken() { return localStorage.getItem('rt') }
export function setTokens(at: string, rt: string) {
  localStorage.setItem('at', at)
  localStorage.setItem('rt', rt)
}
export function clearTokens() {
  localStorage.removeItem('at')
  localStorage.removeItem('rt')
  localStorage.removeItem('user')
}

// ─── Core request ─────────────────────────────────────────────────────────────
let refreshing: Promise<boolean> | null = null

async function req<T>(method: string, path: string, body?: any, form = false): Promise<T> {
  const headers: Record<string, string> = {}
  const at = getAccessToken()
  if (at) headers['Authorization'] = `Bearer ${at}`
  if (!form && body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: form ? body : body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && path !== '/auth/refresh') {
    if (!refreshing) refreshing = doRefresh()
    const ok = await refreshing
    refreshing = null
    if (ok) return req(method, path, body, form)
    clearTokens()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message
    throw new Error(Array.isArray(msg) ? msg.join(', ') : msg || `HTTP ${res.status}`)
  }
  return data as T
}

async function doRefresh(): Promise<boolean> {
  const rt = getRefreshToken()
  if (!rt) return false
  try {
    const payload = JSON.parse(atob(rt.split('.')[1]))
    const data: any = await req('POST', '/auth/refresh', { refreshToken: rt })
    if (data.accessToken) { setTokens(data.accessToken, data.refreshToken); return true }
    return false
  } catch { return false }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  googleUrl: () => `${BASE}/auth/google`,

  handleCallback(): { needsNickname: boolean } {
    const p = new URLSearchParams(window.location.search)
    const at = p.get('accessToken'), rt = p.get('refreshToken')
    if (at && rt) setTokens(at, rt)
    return { needsNickname: p.get('needsNickname') === 'true' }
  },

  sendOtp: (phoneNumber: string) =>
    req<{ message: string; expiresIn: number }>('POST', '/auth/phone/send', { phoneNumber }),

  verifyOtp: (phoneNumber: string, code: string) =>
    req<AuthResponse>('POST', '/auth/phone/verify', { phoneNumber, code }),

  setNickname: (nickname: string) =>
    req<AuthResponse>('POST', '/auth/set-nickname', { nickname }),

  me: () => req<User>('GET', '/auth/me'),

  logout: async () => {
    try { await req('POST', '/auth/logout') } catch {}
    clearTokens()
  },
}

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => req<User>('GET', '/users/me'),

  update: (data: { nickname?: string }) => req<User>('PUT', '/users/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    req<{ message: string }>('PUT', '/users/me/password', { currentPassword, newPassword }),

  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return req<User>('PUT', '/users/me/avatar', fd, true)
  },

  checkNickname: (nickname: string) =>
    req<{ available: boolean }>('POST', '/users/check-nickname', { nickname }),

  getProfile: (nickname: string) => req<User>('GET', `/users/${nickname}`),
}

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const roomsApi = {
  create: (data: CreateRoomData) => req<Room>('POST', '/rooms', data),

  join: (roomCode: string) => req<Room>('POST', '/rooms/join', { roomCode }),

  getByCode: (code: string) => req<Room>('GET', `/rooms/${code}`),

  invite: (roomId: string, nickname: string) =>
    req<{ message: string }>('POST', `/rooms/${roomId}/invite`, { nickname }),

  leave: (roomId: string) => req<{ message: string }>('DELETE', `/rooms/${roomId}/leave`),
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  nickname: string
  email?: string
  phoneNumber?: string
  avatarUrl?: string
  gamesPlayed: number
  wins: number
  timesImposter: number
  imposterWins: number
  createdAt?: string
  lastSeen?: string
  needsNickname?: boolean
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  needsNickname?: boolean
  user: User
}

export interface Room {
  id: string
  roomCode: string
  hostId: string
  status: 'waiting' | 'playing' | 'voting' | 'ended'
  durationMinutes: number
  maxPlayers: number
  players: RoomPlayer[]
  createdAt: string
}

export interface RoomPlayer {
  id: string
  userId: string
  nickname: string
  avatarUrl?: string
  isHost: boolean
  isConnected: boolean
  turnOrder: number
}

export interface CreateRoomData {
  durationMinutes: 5 | 10 | 15
  maxPlayers?: number
  wordCategory?: string
}
