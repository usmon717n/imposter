import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { Room } from '../rooms/entities/room.entity';
import { GamePlayer } from './entities/game-player.entity';
import { Message } from './entities/message.entity';
import { Vote } from './entities/vote.entity';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { getRandomWordPair } from './words.data';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(GamePlayer)
    private readonly playerRepo: Repository<GamePlayer>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Vote)
    private readonly voteRepo: Repository<Vote>,
    private readonly roomsService: RoomsService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Start game ───────────────────────────────────────────────────────────

  async startGame(roomId: string, hostId: string) {
    const room = await this.roomsService.getRoomById(roomId);

    if (room.hostId !== hostId) {
      throw new ForbiddenException('Faqat host o\'yinni boshlashi mumkin');
    }
    if (room.status !== 'waiting') {
      throw new BadRequestException('O\'yin allaqachon boshlangan');
    }

    const players = await this.roomsService.getActivePlayers(roomId);
    if (players.length < 3) {
      throw new BadRequestException('Kamida 3 ta o\'yinchi kerak');
    }

    // Assign imposter randomly
    const imposterIndex = Math.floor(Math.random() * players.length);

    // Get word pair
    const wordPair = getRandomWordPair(room.wordCategory);

    // Shuffle turn order
    const shuffled = [...players].sort(() => Math.random() - 0.5);

    const playerWords: Array<{ userId: string; word: string; isImposter: boolean }> = [];

    for (let i = 0; i < shuffled.length; i++) {
      const player = shuffled[i];
      const isImposter = i === imposterIndex;
      const word = isImposter ? wordPair.imposter : wordPair.common;

      await this.playerRepo.update(player.id, {
        isImposter,
        assignedWord: word,
        turnOrder: i,
        isConnected: true,
      });

      playerWords.push({ userId: player.userId, word, isImposter });
    }

    const durationSeconds = room.durationMinutes * 60;
    const now = new Date();
    const endsAt = new Date(now.getTime() + durationSeconds * 1000);
    const firstTurnEndsAt = new Date(now.getTime() + 60 * 1000);

    // Update room
    await this.roomRepo.update(roomId, {
      status: 'playing',
      startedAt: now,
      endsAt,
      commonWord: wordPair.common,
      imposterWord: wordPair.imposter,
      currentTurnIndex: 0,
      currentTurnUserId: shuffled[0].userId,
      turnStartedAt: now,
    });

    // Update stats
    for (const { userId, isImposter } of playerWords) {
      await this.usersService.incrementStats(userId, { isImposter });
    }

    const playersInfo = shuffled.map((p, i) => ({
      userId: p.userId,
      nickname: p.user?.nickname,
      avatarUrl: p.user?.avatarUrl,
      turnOrder: i,
      isEliminated: false,
    }));

    return {
      playerWords,
      players: playersInfo,
      firstTurnUserId: shuffled[0].userId,
      firstTurnEndsAt: firstTurnEndsAt.toISOString(),
      durationSeconds,
    };
  }

  // ─── Send message ─────────────────────────────────────────────────────────

  async sendMessage(roomId: string, userId: string, content: string) {
    if (!content?.trim()) throw new BadRequestException('Xabar bo\'sh bo\'lishi mumkin emas');
    if (content.length > 500) throw new BadRequestException('Xabar juda uzun (max 500 belgi)');

    const room = await this.roomsService.getRoomById(roomId);
    if (room.status !== 'playing') throw new BadRequestException('O\'yin faol emas');

    // Check it's user's turn
    if (room.currentTurnUserId !== userId) {
      throw new BadRequestException('Hozir sizning navbatingiz emas');
    }

    const player = await this.roomsService.getPlayer(roomId, userId);
    if (!player) throw new BadRequestException('Siz bu xonada emassiz');
    if (player.isEliminated) throw new BadRequestException('Siz eliminatsiya qilingansiz');

    // Save message
    const message = this.messageRepo.create({
      roomId,
      gamePlayerId: player.id,
      content: content.trim(),
    });
    await this.messageRepo.save(message);
    await this.playerRepo.update(player.id, { messagesCount: () => '"messages_count" + 1' });

    // Advance turn
    const { nextTurnUserId, turnNumber } = await this.advanceTurn(room);

    const turnEndsAt = new Date(Date.now() + 60 * 1000).toISOString();

    return {
      messageId: message.id,
      nextTurnUserId,
      turnNumber,
      turnEndsAt,
    };
  }

  // ─── Skip turn ────────────────────────────────────────────────────────────

  async skipTurn(roomId: string, userId: string) {
    const room = await this.roomsService.getRoomById(roomId);
    if (room.status !== 'playing') return { nextTurnUserId: null, turnEndsAt: null };

    // Only skip if it's this user's turn (or auto-skip by timer)
    if (room.currentTurnUserId !== userId) {
      // Not this user's turn — silently ignore (timer auto-skip)
      return { nextTurnUserId: room.currentTurnUserId, turnEndsAt: new Date(Date.now() + 60000).toISOString() };
    }

    const { nextTurnUserId } = await this.advanceTurn(room);
    const turnEndsAt = new Date(Date.now() + 60 * 1000).toISOString();

    return { nextTurnUserId, turnEndsAt };
  }

  private async advanceTurn(room: Room) {
    const activePlayers = await this.roomsService.getActivePlayers(room.id);
    if (activePlayers.length === 0) return { nextTurnUserId: null, turnNumber: 0 };

    const currentIdx = activePlayers.findIndex((p) => p.userId === room.currentTurnUserId);
    const nextIdx = (currentIdx + 1) % activePlayers.length;
    const nextPlayer = activePlayers[nextIdx];

    await this.roomRepo.update(room.id, {
      currentTurnIndex: nextIdx,
      currentTurnUserId: nextPlayer.userId,
      turnStartedAt: new Date(),
    });

    return {
      nextTurnUserId: nextPlayer.userId,
      turnNumber: nextIdx,
    };
  }

  // ─── Cast vote ────────────────────────────────────────────────────────────

  async castVote(roomId: string, voterId: string, targetPlayerId: string) {
    const room = await this.roomsService.getRoomById(roomId);

    const voterPlayer = await this.roomsService.getPlayer(roomId, voterId);
    if (!voterPlayer) throw new BadRequestException('Siz bu xonada emassiz');
    if (voterPlayer.isEliminated) throw new BadRequestException('Siz eliminatsiya qilingansiz');

    const targetPlayer = await this.playerRepo.findOne({
      where: { id: targetPlayerId, roomId },
      relations: ['user'],
    });
    if (!targetPlayer) throw new BadRequestException('O\'yinchi topilmadi');
    if (targetPlayer.isEliminated) throw new BadRequestException('Bu o\'yinchi allaqachon eliminatsiya qilingan');

    // Check if already voted this round
    const existing = await this.voteRepo.findOne({
      where: { roomId, voterId: voterPlayer.id, round: 1 },
    });
    if (existing) {
      // Change vote: update
      await this.voteRepo.update(existing.id, { targetId: targetPlayerId });
    } else {
      const vote = this.voteRepo.create({
        roomId,
        voterId: voterPlayer.id,
        targetId: targetPlayerId,
        round: 1,
      });
      await this.voteRepo.save(vote);
      await this.playerRepo.update(targetPlayerId, { votesReceived: () => '"votes_received" + 1' });
    }

    // Count all votes
    const votes = await this.voteRepo.find({ where: { roomId, round: 1 }, relations: ['target'] });
    const voteCounts: Record<string, number> = {};
    for (const v of votes) {
      voteCounts[v.targetId] = (voteCounts[v.targetId] || 0) + 1;
    }

    // Check if majority (more than half active players)
    const activePlayers = await this.roomsService.getActivePlayers(roomId);
    const majority = Math.floor(activePlayers.length / 2) + 1;
    const maxVotes = Math.max(...Object.values(voteCounts));
    const allVoted = votes.length >= activePlayers.length;

    let resolved = false;
    let eliminatedPlayerId: string | null = null;

    if (maxVotes >= majority || allVoted) {
      resolved = true;
      // Find player with most votes
      eliminatedPlayerId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    }

    if (!resolved) {
      return { resolved: false, voteCounts };
    }

    // Eliminate player
    const eliminated = await this.playerRepo.findOne({
      where: { id: eliminatedPlayerId },
      relations: ['user'],
    });

    await this.playerRepo.update(eliminatedPlayerId, { isEliminated: true });

    const wasImposter = eliminated.isImposter;
    let gameEnded = false;
    let winner: 'players' | 'imposter' | null = null;

    if (wasImposter) {
      // Players win
      gameEnded = true;
      winner = 'players';
      await this.endGame(roomId, 'imposter_caught');
    } else {
      // Check if imposter is now in majority or only active players left
      const remaining = await this.roomsService.getActivePlayers(roomId);
      const imposterStillIn = remaining.some((p) => p.isImposter);
      if (!imposterStillIn || remaining.length <= 2) {
        gameEnded = true;
        winner = 'imposter';
        await this.endGame(roomId, 'imposter_survived');
      }
    }

    const imposterPlayer = (await this.roomsService.getAllPlayers(roomId)).find(
      (p) => p.isImposter,
    );

    return {
      resolved: true,
      voteCounts,
      eliminatedPlayerId,
      eliminatedUserId: eliminated.userId,
      eliminatedNickname: eliminated.user?.nickname,
      wasImposter,
      gameEnded,
      winner,
      imposterUserId: imposterPlayer?.userId,
      imposterNickname: imposterPlayer?.user?.nickname,
      commonWord: room.commonWord,
      imposterWord: room.imposterWord,
    };
  }

  // ─── End game ─────────────────────────────────────────────────────────────

  async endGame(roomId: string, reason: string) {
    const room = await this.roomsService.getRoomById(roomId);
    if (room.status === 'ended') return this.getGameEndData(room);

    const winner: 'players' | 'imposter' =
      reason === 'imposter_caught' ? 'players' : 'imposter';

    await this.roomRepo.update(roomId, {
      status: 'ended',
      endedAt: new Date(),
      winnerRole: winner,
    });

    // Update player stats
    const allPlayers = await this.roomsService.getAllPlayers(roomId);
    for (const player of allPlayers) {
      const isImposter = player.isImposter;
      const win = isImposter ? winner === 'imposter' : winner === 'players';
      const imposterWin = isImposter && winner === 'imposter';
      await this.usersService.incrementStats(player.userId, { win, imposterWin });
    }

    return this.getGameEndData(room);
  }

  private async getGameEndData(room: Room) {
    const players = await this.roomsService.getAllPlayers(room.id);
    const imposterPlayer = players.find((p) => p.isImposter);
    return {
      imposterUserId: imposterPlayer?.userId,
      imposterNickname: imposterPlayer?.user?.nickname,
      commonWord: room.commonWord,
      imposterWord: room.imposterWord,
    };
  }

  // ─── Handle disconnect ────────────────────────────────────────────────────

  async handlePlayerDisconnect(userId: string, server: Server) {
    // Find active game rooms for this user
    const player = await this.playerRepo.findOne({
      where: { userId, isConnected: true },
      relations: ['room'],
    });

    if (!player) return;

    await this.playerRepo.update(player.id, { isConnected: false });

    const room = player.room;
    if (room && (room.status === 'playing' || room.status === 'waiting')) {
      server.to(`room:${room.id}`).emit('player_disconnected', { userId });
    }
  }

  // ─── Get game history ─────────────────────────────────────────────────────

  async getRoomMessages(roomId: string) {
    return this.messageRepo.find({
      where: { roomId },
      relations: ['gamePlayer', 'gamePlayer.user'],
      order: { sentAt: 'ASC' },
    });
  }
}
