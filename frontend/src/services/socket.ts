// src/services/socket.ts
import { io, Socket } from 'socket.io-client'
import { getAccessToken } from './api'

const WS_URL = import.meta.env.VITE_WS_URL || ''

class SocketService {
  private socket: Socket | null = null
  private _roomId: string | null = null

  connect() {
    if (this.socket?.connected) return this.socket
    this.socket = io(`${WS_URL}/game`, {
      auth: { token: getAccessToken() },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
    this.socket.on('connect', () => console.log('🔌 WS connected'))
    this.socket.on('disconnect', (r) => console.log('🔌 WS disconnected:', r))
    this.socket.on('connect_error', (e) => console.error('WS error:', e.message))
    return this.socket
  }

  disconnect() {
    this.socket?.disconnect()
    this.socket = null
  }

  get connected() { return !!this.socket?.connected }
  get socketId() { return this.socket?.id }

  // ── Emitters ────────────────────────────────────────────────────────────────

  emit<T>(event: string, data?: any): Promise<T> {
    if (!this.socket?.connected) this.connect()
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`Socket timeout: ${event}`)), 10000)
      this.socket!.emit(event, data, (r: T) => { clearTimeout(t); res(r) })
    })
  }

  joinRoom(roomCode: string) { return this.emit<SocketResponse>('join_room', { roomCode }) }
  leaveRoom(roomId: string) { return this.emit<SocketResponse>('leave_room', { roomId }) }
  startGame(roomId: string) { return this.emit<SocketResponse>('start_game', { roomId }) }
  sendMessage(roomId: string, message: string) { return this.emit<SocketResponse>('send_message', { roomId, message }) }
  skipTurn(roomId: string) { return this.emit<SocketResponse>('skip_turn', { roomId }) }
  castVote(roomId: string, targetPlayerId: string) { return this.emit<SocketResponse>('cast_vote', { roomId, targetPlayerId }) }
  startVoting(roomId: string) { return this.emit<SocketResponse>('start_voting', { roomId }) }

  // ── Listeners ───────────────────────────────────────────────────────────────

  on<T = any>(event: string, fn: (data: T) => void): () => void {
    if (!this.socket) this.connect()
    this.socket!.on(event, fn)
    return () => this.socket?.off(event, fn)
  }

  off(event: string, fn?: any) { this.socket?.off(event, fn) }
}

export const socket = new SocketService()

export interface SocketResponse { success: boolean; error?: string; room?: any }
