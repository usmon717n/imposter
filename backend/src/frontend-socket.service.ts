/**
 * Frontend Socket Service
 * Bu fayl frontend (React) tomonida ishlatiladi.
 * Faylni: src/services/socket.service.ts ga qo'ying
 *
 * Ishlatish:
 *   npm install socket.io-client
 */

import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api.service';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Function>>();

  // ─── Connection ─────────────────────────────────────────────────────────

  connect(): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(`${SOCKET_URL}/game`, {
      auth: { token: getAccessToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  get connected(): boolean {
    return this.socket?.connected || false;
  }

  // ─── Emit helpers ────────────────────────────────────────────────────────

  // Join socket room
  joinRoom(roomCode: string): Promise<{ success: boolean; room?: any; error?: string }> {
    return this.emitWithAck('join_room', { roomCode });
  }

  // Leave socket room
  leaveRoom(roomId: string): Promise<{ success: boolean }> {
    return this.emitWithAck('leave_room', { roomId });
  }

  // Start game (host only)
  startGame(roomId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithAck('start_game', { roomId });
  }

  // Send chat message
  sendMessage(roomId: string, message: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithAck('send_message', { roomId, message });
  }

  // Skip your turn
  skipTurn(roomId: string): Promise<{ success: boolean }> {
    return this.emitWithAck('skip_turn', { roomId });
  }

  // Cast vote
  castVote(roomId: string, targetPlayerId: string): Promise<{ success: boolean; error?: string }> {
    return this.emitWithAck('cast_vote', { roomId, targetPlayerId });
  }

  // Start voting phase
  startVoting(roomId: string): Promise<{ success: boolean }> {
    return this.emitWithAck('start_voting', { roomId });
  }

  // ─── Event listeners ─────────────────────────────────────────────────────

  on(event: GameEvent, callback: Function): () => void {
    if (!this.socket) this.connect();

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket!.on(event, callback as any);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: GameEvent, callback: Function) {
    this.socket?.off(event, callback as any);
    this.listeners.get(event)?.delete(callback);
  }

  offAll(event: GameEvent) {
    this.socket?.off(event);
    this.listeners.delete(event);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private emitWithAck<T>(event: string, data: any): Promise<T> {
    if (!this.socket?.connected) this.connect();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Socket timeout')), 10000);
      this.socket!.emit(event, data, (response: T) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }
}

// Singleton
export const socketService = new SocketService();

// ─── Event type definitions ───────────────────────────────────────────────────

export type GameEvent =
  | 'room_state'
  | 'player_joined'
  | 'player_left'
  | 'player_disconnected'
  | 'game_started'
  | 'game_phase_changed'
  | 'new_message'
  | 'turn_changed'
  | 'turn_skipped'
  | 'voting_started'
  | 'vote_cast'
  | 'voting_resolved'
  | 'game_ended'
  | 'error';

// ─── Event payload types ──────────────────────────────────────────────────────

export interface GameStartedPayload {
  word: string;
  isImposter: boolean;
  durationSeconds: number;
  players: Array<{
    userId: string;
    nickname: string;
    avatarUrl?: string;
    turnOrder: number;
  }>;
}

export interface NewMessagePayload {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  message: string;
  timestamp: string;
}

export interface TurnChangedPayload {
  currentTurnUserId: string;
  turnNumber: number;
  turnEndsAt: string;
}

export interface TurnSkippedPayload {
  skippedUserId: string;
  nextTurnUserId: string;
  autoSkipped?: boolean;
  turnEndsAt: string;
}

export interface VotingResolvedPayload {
  eliminatedPlayerId: string;
  eliminatedUserId: string;
  eliminatedNickname: string;
  wasImposter: boolean;
  gameEnded: boolean;
  winner?: 'players' | 'imposter';
  imposterWord?: string;
  commonWord?: string;
}

export interface GameEndedPayload {
  winner: 'players' | 'imposter';
  reason?: string;
  imposterUserId: string;
  imposterNickname: string;
  commonWord: string;
  imposterWord: string;
}

// ─── React Hook (bonus) ───────────────────────────────────────────────────────
// Faylni: src/hooks/useGameSocket.ts ga qo'ying va shu yerdan olib ishlatishingiz mumkin

export function createUseGameSocket() {
  return function useGameSocket(roomId: string | null) {
    // Agar React hooks kerak bo'lsa, bu yerda useState/useEffect ishlatiladi.
    // React importi bo'lgani uchun bu faylda emas, alohida hook faylida yoziladi.
    // Namuna:
    //
    // const [messages, setMessages] = useState<NewMessagePayload[]>([]);
    // const [currentTurnUserId, setCurrentTurnUserId] = useState<string | null>(null);
    //
    // useEffect(() => {
    //   if (!roomId) return;
    //   const unsub1 = socketService.on('new_message', (data: NewMessagePayload) => {
    //     setMessages(prev => [...prev, data]);
    //   });
    //   const unsub2 = socketService.on('turn_changed', (data: TurnChangedPayload) => {
    //     setCurrentTurnUserId(data.currentTurnUserId);
    //   });
    //   return () => { unsub1(); unsub2(); };
    // }, [roomId]);
    //
    // return { messages, currentTurnUserId, socketService };
  };
}
