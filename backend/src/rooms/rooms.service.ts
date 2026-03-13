import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './entities/room.entity';
import { GamePlayer } from '../game/entities/game-player.entity';
import { UsersService } from '../users/users.service';
import { CreateRoomDto, JoinRoomDto, RoomResponseDto, PlayerInRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,
    @InjectRepository(GamePlayer)
    private readonly playerRepo: Repository<GamePlayer>,
    private readonly usersService: UsersService,
  ) {}

  // ─── Create room ───────────────────────────────────────────────────────────

  async createRoom(hostId: string, dto: CreateRoomDto): Promise<RoomResponseDto> {
    // Check if user already in active room
    const activePlayer = await this.playerRepo.findOne({
      where: { userId: hostId },
      relations: ['room'],
    });
    if (activePlayer?.room?.status === 'waiting' || activePlayer?.room?.status === 'playing') {
      throw new ConflictException('Siz allaqachon boshqa xonadadasiz');
    }

    const roomCode = await this.generateUniqueCode();
    const room = this.roomRepo.create({
      roomCode,
      hostId,
      status: 'waiting',
      durationMinutes: dto.durationMinutes,
      maxPlayers: dto.maxPlayers || 6,
      wordCategory: dto.wordCategory,
    });

    await this.roomRepo.save(room);

    // Add host as first player
    const player = this.playerRepo.create({
      roomId: room.id,
      userId: hostId,
      isConnected: true,
      turnOrder: 0,
    });
    await this.playerRepo.save(player);

    return this.getRoomWithPlayers(room.id);
  }

  // ─── Get room ──────────────────────────────────────────────────────────────

  async getRoomByCode(code: string): Promise<RoomResponseDto> {
    const room = await this.roomRepo.findOne({ where: { roomCode: code.toUpperCase() } });
    if (!room) throw new NotFoundException('Xona topilmadi');
    return this.getRoomWithPlayers(room.id);
  }

  async getRoomById(id: string): Promise<Room> {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: ['gamePlayers', 'gamePlayers.user'],
    });
    if (!room) throw new NotFoundException('Xona topilmadi');
    return room;
  }

  async getRoomWithPlayers(roomId: string): Promise<RoomResponseDto> {
    const room = await this.roomRepo.findOne({
      where: { id: roomId },
      relations: ['gamePlayers', 'gamePlayers.user'],
    });
    if (!room) throw new NotFoundException('Xona topilmadi');

    return {
      id: room.id,
      roomCode: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      durationMinutes: room.durationMinutes,
      maxPlayers: room.maxPlayers,
      players: room.gamePlayers
        .sort((a, b) => a.turnOrder - b.turnOrder)
        .map((gp) => this.toPlayerDto(gp, room.hostId)),
      createdAt: room.createdAt,
    };
  }

  // ─── Join room ─────────────────────────────────────────────────────────────

  async joinRoom(userId: string, dto: JoinRoomDto): Promise<RoomResponseDto> {
    const room = await this.roomRepo.findOne({
      where: { roomCode: dto.roomCode.toUpperCase() },
      relations: ['gamePlayers'],
    });

    if (!room) throw new NotFoundException('Xona topilmadi');
    if (room.status !== 'waiting') throw new BadRequestException('O\'yin allaqachon boshlangan');
    if (room.gamePlayers.length >= room.maxPlayers) {
      throw new BadRequestException('Xona to\'lgan');
    }

    // Check already joined
    const existing = room.gamePlayers.find((gp) => gp.userId === userId);
    if (existing) {
      // Already in room — just reconnect
      existing.isConnected = true;
      await this.playerRepo.save(existing);
      return this.getRoomWithPlayers(room.id);
    }

    const player = this.playerRepo.create({
      roomId: room.id,
      userId,
      isConnected: true,
      turnOrder: room.gamePlayers.length,
    });
    await this.playerRepo.save(player);

    return this.getRoomWithPlayers(room.id);
  }

  // ─── Leave room ────────────────────────────────────────────────────────────

  async leaveRoom(userId: string, roomId: string): Promise<{ message: string }> {
    const room = await this.getRoomById(roomId);

    if (room.status === 'playing') {
      // Mark as disconnected but keep in game
      const player = room.gamePlayers.find((gp) => gp.userId === userId);
      if (player) {
        player.isConnected = false;
        await this.playerRepo.save(player);
      }
    } else {
      // Remove from waiting room
      await this.playerRepo.delete({ roomId, userId });

      // If host left, transfer or close room
      if (room.hostId === userId) {
        const remaining = await this.playerRepo.find({ where: { roomId } });
        if (remaining.length === 0) {
          await this.roomRepo.update(roomId, { status: 'ended' });
        } else {
          // Transfer host to next player
          await this.roomRepo.update(roomId, { hostId: remaining[0].userId });
        }
      }
    }

    return { message: 'Xonadan chiqdingiz' };
  }

  // ─── Invite player ─────────────────────────────────────────────────────────

  async invitePlayer(
    hostId: string,
    roomId: string,
    nickname: string,
  ): Promise<{ message: string }> {
    const room = await this.getRoomById(roomId);
    if (room.hostId !== hostId) throw new ForbiddenException('Faqat host taklif yuborishi mumkin');

    const targetUser = await this.usersService.findByNickname(nickname);
    if (!targetUser) throw new NotFoundException('Foydalanuvchi topilmadi');

    // In real app: send notification via WebSocket or push
    // For now: just return success
    return { message: `${nickname} ga taklif yuborildi` };
  }

  // ─── Get player ────────────────────────────────────────────────────────────

  async getPlayer(roomId: string, userId: string): Promise<GamePlayer | null> {
    return this.playerRepo.findOne({
      where: { roomId, userId },
      relations: ['user'],
    });
  }

  async getActivePlayers(roomId: string): Promise<GamePlayer[]> {
    return this.playerRepo.find({
      where: { roomId, isEliminated: false },
      relations: ['user'],
      order: { turnOrder: 'ASC' },
    });
  }

  async getAllPlayers(roomId: string): Promise<GamePlayer[]> {
    return this.playerRepo.find({
      where: { roomId },
      relations: ['user'],
      order: { turnOrder: 'ASC' },
    });
  }

  async updatePlayer(id: string, data: Partial<GamePlayer>): Promise<void> {
    await this.playerRepo.update(id, data);
  }

  async updateRoom(id: string, data: Partial<Room>): Promise<void> {
    await this.roomRepo.update(id, data);
  }

  async saveRoom(room: Room): Promise<Room> {
    return this.roomRepo.save(room);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code: string;
    let attempts = 0;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const existing = await this.roomRepo.findOne({ where: { roomCode: code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 20);
    return code;
  }

  private toPlayerDto(gp: GamePlayer, hostId: string): PlayerInRoomDto {
    return {
      id: gp.id,
      userId: gp.userId,
      nickname: gp.user?.nickname || 'Unknown',
      avatarUrl: gp.user?.avatarUrl,
      isHost: gp.userId === hostId,
      isConnected: gp.isConnected,
      turnOrder: gp.turnOrder,
    };
  }
}
