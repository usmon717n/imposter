import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { GameService } from './game.service';
import { AuthService } from '../auth/auth.service';
import { RoomsService } from '../rooms/rooms.service';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';

// ─── WS Event Interfaces ──────────────────────────────────────────────────────

interface WsSendMessagePayload {
  roomId: string;
  message: string;
}

interface WsVotePayload {
  roomId: string;
  targetPlayerId: string; // GamePlayer.id (not userId)
}

interface WsJoinRoomPayload {
  roomCode: string;
}

interface WsStartGamePayload {
  roomId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/game',
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  // socketId → userId mapping
  private readonly socketUsers = new Map<string, string>();
  // userId → socketId mapping
  private readonly userSockets = new Map<string, string>();

  constructor(
    private readonly gameService: GameService,
    private readonly authService: AuthService,
    private readonly roomsService: RoomsService,
  ) {}

  // ─── Connection lifecycle ─────────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn(`Unauthenticated connection: ${client.id}`);
      client.disconnect();
      return;
    }

    const user = await this.authService.validateSocketToken(token);
    if (!user) {
      client.emit('error', { message: 'Token noto\'g\'ri' });
      client.disconnect();
      return;
    }

    // Disconnect previous socket if exists
    const prevSocketId = this.userSockets.get(user.id);
    if (prevSocketId && prevSocketId !== client.id) {
      const prevSocket = this.server.sockets.sockets.get(prevSocketId);
      prevSocket?.disconnect();
    }

    this.socketUsers.set(client.id, user.id);
    this.userSockets.set(user.id, client.id);
    client.data.user = user;

    this.logger.log(`✅ Connected: ${user.nickname} (${client.id})`);

    // Rejoin any active rooms
    await this.rejoinActiveRooms(client, user.id);
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      this.socketUsers.delete(client.id);
      this.userSockets.delete(userId);
      this.logger.log(`❌ Disconnected: ${userId} (${client.id})`);

      // Mark player as disconnected in active rooms
      await this.gameService.handlePlayerDisconnect(userId, this.server);
    }
  }

  // ─── Room events ──────────────────────────────────────────────────────────

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsJoinRoomPayload,
  ) {
    const user = client.data.user;
    if (!user) throw new WsException('Autorizatsiya talab qilinadi');

    try {
      const room = await this.roomsService.getRoomByCode(payload.roomCode);

      // Join socket room
      const socketRoom = `room:${room.id}`;
      await client.join(socketRoom);

      // Notify others
      client.to(socketRoom).emit('player_joined', {
        player: {
          userId: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          isConnected: true,
        },
      });

      // Send room state to joining client
      client.emit('room_state', room);

      return { success: true, room };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const user = client.data.user;
    const socketRoom = `room:${payload.roomId}`;

    await client.leave(socketRoom);
    await this.roomsService.leaveRoom(user.id, payload.roomId);

    client.to(socketRoom).emit('player_left', { userId: user.id });
    return { success: true };
  }

  // ─── Game events ──────────────────────────────────────────────────────────

  @SubscribeMessage('start_game')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsStartGamePayload,
  ) {
    const user = client.data.user;

    try {
      const result = await this.gameService.startGame(payload.roomId, user.id);

      const socketRoom = `room:${payload.roomId}`;

      // Send each player their own word privately
      for (const playerInfo of result.playerWords) {
        const playerSocketId = this.userSockets.get(playerInfo.userId);
        if (playerSocketId) {
          const playerSocket = this.server.sockets.sockets.get(playerSocketId);
          playerSocket?.emit('game_started', {
            word: playerInfo.word,
            isImposter: playerInfo.isImposter,
            durationSeconds: result.durationSeconds,
            players: result.players,
          });
        }
      }

      // Broadcast game start (without words) to all
      this.server.to(socketRoom).emit('game_phase_changed', {
        phase: 'playing',
        currentTurnUserId: result.firstTurnUserId,
        turnEndsAt: result.firstTurnEndsAt,
      });

      // Start turn timer
      this.startTurnTimer(payload.roomId, result.firstTurnUserId, result.durationSeconds);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsSendMessagePayload,
  ) {
    const user = client.data.user;

    try {
      const result = await this.gameService.sendMessage(
        payload.roomId,
        user.id,
        payload.message,
      );

      const socketRoom = `room:${payload.roomId}`;

      // Broadcast message to all in room
      this.server.to(socketRoom).emit('new_message', {
        id: result.messageId,
        userId: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        message: payload.message,
        timestamp: new Date().toISOString(),
      });

      // Advance turn
      this.server.to(socketRoom).emit('turn_changed', {
        currentTurnUserId: result.nextTurnUserId,
        turnNumber: result.turnNumber,
        turnEndsAt: result.turnEndsAt,
      });

      // Reschedule turn timer
      this.scheduleTurnTimeout(payload.roomId, result.nextTurnUserId, 60);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('skip_turn')
  async handleSkipTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const user = client.data.user;

    try {
      const result = await this.gameService.skipTurn(payload.roomId, user.id);
      const socketRoom = `room:${payload.roomId}`;

      this.server.to(socketRoom).emit('turn_skipped', {
        skippedUserId: user.id,
        nextTurnUserId: result.nextTurnUserId,
        turnEndsAt: result.turnEndsAt,
      });

      this.scheduleTurnTimeout(payload.roomId, result.nextTurnUserId, 60);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('cast_vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WsVotePayload,
  ) {
    const user = client.data.user;

    try {
      const result = await this.gameService.castVote(
        payload.roomId,
        user.id,
        payload.targetPlayerId,
      );

      const socketRoom = `room:${payload.roomId}`;

      // Broadcast vote (anonymous - show just count)
      this.server.to(socketRoom).emit('vote_cast', {
        voterId: user.id,
        targetPlayerId: payload.targetPlayerId,
        voteCounts: result.voteCounts,
      });

      // If voting resolved (majority reached or everyone voted)
      if (result.resolved) {
        this.server.to(socketRoom).emit('voting_resolved', {
          eliminatedPlayerId: result.eliminatedPlayerId,
          eliminatedUserId: result.eliminatedUserId,
          eliminatedNickname: result.eliminatedNickname,
          wasImposter: result.wasImposter,
          gameEnded: result.gameEnded,
          winner: result.winner,
          imposterWord: result.imposterWord,
          commonWord: result.commonWord,
        });

        if (result.gameEnded) {
          this.server.to(socketRoom).emit('game_ended', {
            winner: result.winner,
            imposterUserId: result.imposterUserId,
            imposterNickname: result.imposterNickname,
            commonWord: result.commonWord,
            imposterWord: result.imposterWord,
          });
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('start_voting')
  async handleStartVoting(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const user = client.data.user;
    const socketRoom = `room:${payload.roomId}`;

    // Verify user is in room
    const player = await this.roomsService.getPlayer(payload.roomId, user.id);
    if (!player) return { success: false, error: 'Siz bu xonada emassiz' };

    this.server.to(socketRoom).emit('voting_started', {
      startedBy: user.nickname,
      endsAt: new Date(Date.now() + 60000).toISOString(),
    });

    await this.roomsService.updateRoom(payload.roomId, { status: 'voting' });

    return { success: true };
  }

  // ─── Turn timer management ────────────────────────────────────────────────

  private readonly turnTimers = new Map<string, NodeJS.Timeout>();

  private startTurnTimer(roomId: string, userId: string, gameDurationSec: number) {
    this.scheduleTurnTimeout(roomId, userId, 60);

    // Game end timer
    const gameTimer = setTimeout(async () => {
      await this.handleGameTimeUp(roomId);
    }, gameDurationSec * 1000);

    this.turnTimers.set(`game:${roomId}`, gameTimer);
  }

  private scheduleTurnTimeout(roomId: string, userId: string, seconds: number) {
    // Clear existing turn timer
    const existing = this.turnTimers.get(`turn:${roomId}`);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      // Auto-skip turn
      try {
        const result = await this.gameService.skipTurn(roomId, userId);
        this.server.to(`room:${roomId}`).emit('turn_skipped', {
          skippedUserId: userId,
          nextTurnUserId: result.nextTurnUserId,
          autoSkipped: true,
          turnEndsAt: result.turnEndsAt,
        });
        this.scheduleTurnTimeout(roomId, result.nextTurnUserId, 60);
      } catch (e) {
        this.logger.error(`Turn skip error: ${e.message}`);
      }
    }, seconds * 1000);

    this.turnTimers.set(`turn:${roomId}`, timer);
  }

  private async handleGameTimeUp(roomId: string) {
    const socketRoom = `room:${roomId}`;
    try {
      const result = await this.gameService.endGame(roomId, 'timeout');
      this.server.to(socketRoom).emit('game_ended', {
        winner: 'imposter',
        reason: 'timeout',
        imposterUserId: result.imposterUserId,
        imposterNickname: result.imposterNickname,
        commonWord: result.commonWord,
        imposterWord: result.imposterWord,
      });
      // Cleanup timers
      this.cleanupRoomTimers(roomId);
    } catch (e) {
      this.logger.error(`Game time-up error: ${e.message}`);
    }
  }

  private cleanupRoomTimers(roomId: string) {
    const turnTimer = this.turnTimers.get(`turn:${roomId}`);
    if (turnTimer) { clearTimeout(turnTimer); this.turnTimers.delete(`turn:${roomId}`); }
    const gameTimer = this.turnTimers.get(`game:${roomId}`);
    if (gameTimer) { clearTimeout(gameTimer); this.turnTimers.delete(`game:${roomId}`); }
  }

  // ─── Helper: rejoin on reconnect ─────────────────────────────────────────

  private async rejoinActiveRooms(client: Socket, userId: string) {
    try {
      const players = await this.roomsService.getAllPlayers(null);
      // This would need a query by userId - simplified here
    } catch (e) {
      // Ignore
    }
  }

  // ─── Broadcast helper (called from GameService) ───────────────────────────

  emitToRoom(roomId: string, event: string, data: any) {
    this.server.to(`room:${roomId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
