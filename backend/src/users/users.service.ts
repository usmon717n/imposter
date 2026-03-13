import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { UpdateProfileDto, ChangePasswordDto, UserResponseDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Find helpers ─────────────────────────────────────────────────────────

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phoneNumber } });
  }

  async findByNickname(nickname: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { nickname } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { googleId } });
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.findById(userId);
    return this.toResponseDto(user);
  }

  async getPublicProfile(nickname: string): Promise<UserResponseDto> {
    const user = await this.findByNickname(nickname);
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return this.toResponseDto(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.findById(userId);

    if (dto.nickname && dto.nickname !== user.nickname) {
      // Check nickname change cooldown (14 days)
      if (user.nicknameChangedAt) {
        const daysSince = (Date.now() - user.nicknameChangedAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 14) {
          const daysLeft = Math.ceil(14 - daysSince);
          throw new BadRequestException(`Nickname o'zgartirish uchun ${daysLeft} kun kutishingiz kerak`);
        }
      }

      // Check uniqueness
      const existing = await this.findByNickname(dto.nickname);
      if (existing && existing.id !== userId) {
        throw new ConflictException('Bu nickname band');
      }

      user.nickname = dto.nickname;
      user.nicknameChangedAt = new Date();
    }

    await this.userRepo.save(user);
    return this.toResponseDto(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.findById(userId);

    if (!user.passwordHash) {
      throw new BadRequestException('Bu hisob parol bilan kirmagan');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Joriy parol noto\'g\'ri');

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);

    return { message: 'Parol muvaffaqiyatli o\'zgartirildi' };
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<UserResponseDto> {
    const user = await this.findById(userId);
    user.avatarUrl = avatarUrl;
    await this.userRepo.save(user);
    return this.toResponseDto(user);
  }

  async checkNicknameAvailable(nickname: string): Promise<{ available: boolean }> {
    const existing = await this.findByNickname(nickname);
    return { available: !existing };
  }

  async updateLastSeen(userId: string): Promise<void> {
    await this.userRepo.update(userId, { lastSeen: new Date() });
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const hash = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.userRepo.update(userId, { refreshTokenHash: hash });
  }

  async verifyRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user.refreshTokenHash) return false;
    return bcrypt.compare(refreshToken, user.refreshTokenHash);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  async incrementStats(
    userId: string,
    stats: { win?: boolean; isImposter?: boolean; imposterWin?: boolean },
  ): Promise<void> {
    const updates: Partial<User> = { gamesPlayed: undefined };
    await this.userRepo.increment({ id: userId }, 'gamesPlayed', 1);
    if (stats.win) await this.userRepo.increment({ id: userId }, 'wins', 1);
    if (stats.isImposter) await this.userRepo.increment({ id: userId }, 'timesImposter', 1);
    if (stats.imposterWin) await this.userRepo.increment({ id: userId }, 'imposterWins', 1);
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      avatarUrl: user.avatarUrl,
      gamesPlayed: user.gamesPlayed,
      wins: user.wins,
      timesImposter: user.timesImposter,
      imposterWins: user.imposterWins,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
    };
  }

  // Generate a unique nickname from base (for Google OAuth)
  async generateUniqueNickname(base: string): Promise<string> {
    const clean = base.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15) || 'Player';
    let nickname = clean;
    let attempt = 0;
    while (await this.findByNickname(nickname)) {
      attempt++;
      nickname = `${clean}${Math.floor(Math.random() * 9000 + 1000)}`;
      if (attempt > 10) break;
    }
    return nickname;
  }
}
