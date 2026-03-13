// src/store/index.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Room } from '../services/api'

// ─── Auth Store ───────────────────────────────────────────────────────────────
interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (u: User | null) => void
  setLoading: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null }),
    }),
    { name: 'imposter-auth', partialize: (s) => ({ user: s.user }) }
  )
)

// ─── Game Store ───────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  userId: string
  nickname: string
  avatarUrl?: string
  message: string
  timestamp: string
  isSystem?: boolean
}

export interface GamePlayer {
  userId: string
  nickname: string
  avatarUrl?: string
  turnOrder: number
  isEliminated?: boolean
  isConnected?: boolean
}

interface GameState {
  // Room
  room: Room | null
  // Game
  phase: 'idle' | 'lobby' | 'word_reveal' | 'playing' | 'voting' | 'result'
  myWord: string | null
  isImposter: boolean
  players: GamePlayer[]
  // Chat
  messages: ChatMessage[]
  currentTurnUserId: string | null
  turnEndsAt: string | null
  // Timer
  gameEndsAt: string | null
  // Voting
  voteCounts: Record<string, number>
  myVote: string | null
  // Result
  winner: 'players' | 'imposter' | null
  imposterUserId: string | null
  imposterNickname: string | null
  commonWord: string | null
  imposterWord: string | null
  eliminatedPlayerId: string | null

  // Actions
  setRoom: (r: Room | null) => void
  setPhase: (p: GameState['phase']) => void
  setGameStarted: (data: { word: string; isImposter: boolean; players: GamePlayer[]; durationSeconds: number }) => void
  addMessage: (m: ChatMessage) => void
  addSystemMessage: (text: string) => void
  setTurn: (userId: string, endsAt: string) => void
  setVoteCounts: (counts: Record<string, number>) => void
  setMyVote: (id: string) => void
  setGameEnded: (data: { winner: 'players' | 'imposter'; imposterUserId: string; imposterNickname: string; commonWord: string; imposterWord: string }) => void
  eliminatePlayer: (playerId: string) => void
  setPlayerConnected: (userId: string, connected: boolean) => void
  addPlayer: (p: GamePlayer) => void
  removePlayer: (userId: string) => void
  reset: () => void
}

const initialGameState = {
  room: null,
  phase: 'idle' as const,
  myWord: null,
  isImposter: false,
  players: [],
  messages: [],
  currentTurnUserId: null,
  turnEndsAt: null,
  gameEndsAt: null,
  voteCounts: {},
  myVote: null,
  winner: null,
  imposterUserId: null,
  imposterNickname: null,
  commonWord: null,
  imposterWord: null,
  eliminatedPlayerId: null,
}

export const useGameStore = create<GameState>((set, get) => ({
  ...initialGameState,

  setRoom: (room) => set({ room }),
  setPhase: (phase) => set({ phase }),

  setGameStarted: ({ word, isImposter, players, durationSeconds }) => set({
    myWord: word,
    isImposter,
    players,
    phase: 'word_reveal',
    gameEndsAt: new Date(Date.now() + durationSeconds * 1000).toISOString(),
    messages: [],
    voteCounts: {},
    myVote: null,
    winner: null,
  }),

  addMessage: (m) => set(s => ({ messages: [...s.messages, m] })),

  addSystemMessage: (text) => set(s => ({
    messages: [...s.messages, {
      id: Date.now().toString(),
      userId: 'system',
      nickname: 'System',
      message: text,
      timestamp: new Date().toISOString(),
      isSystem: true,
    }]
  })),

  setTurn: (userId, endsAt) => set({ currentTurnUserId: userId, turnEndsAt: endsAt }),

  setVoteCounts: (voteCounts) => set({ voteCounts }),

  setMyVote: (id) => set({ myVote: id }),

  setGameEnded: (data) => set({
    ...data,
    phase: 'result',
  }),

  eliminatePlayer: (playerId) => set(s => ({
    eliminatedPlayerId: playerId,
    players: s.players.map(p => p.userId === playerId ? { ...p, isEliminated: true } : p),
  })),

  setPlayerConnected: (userId, connected) => set(s => ({
    players: s.players.map(p => p.userId === userId ? { ...p, isConnected: connected } : p)
  })),

  addPlayer: (p) => set(s => ({
    players: s.players.some(x => x.userId === p.userId) ? s.players : [...s.players, p]
  })),

  removePlayer: (userId) => set(s => ({
    players: s.players.filter(p => p.userId !== userId)
  })),

  reset: () => set(initialGameState),
}))
