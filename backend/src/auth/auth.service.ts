import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { GoogleProfile } from './strategies/google.strategy';
import { SendOtpDto, VerifyOtpDto, SetNicknameDto, TokensDto } from './dto/auth.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly otpService: OtpService,
  ) {}

  // ─── Google OAuth ──────────────────────────────────────────────────────────

  async handleGoogleLogin(profile: GoogleProfile): Promise<TokensDto & { needsNickname?: boolean }> {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      // Check if email already registered
      if (profile.email) {
        const existing = await this.usersService.findByEmail(profile.email);
        if (existing) {
          // Link Google to existing account
          existing.googleId = profile.googleId;
          if (!existing.avatarUrl && profile.avatarUrl) {
            existing.avatarUrl = profile.avatarUrl;
          }
          user = await this.usersService.save(existing);
        }
      }

      if (!user) {
        // New user - needs nickname
        const tempNickname = await this.usersService.generateUniqueNickname(
          profile.displayName || profile.email.split('@')[0],
        );

        user = await this.usersService.create({
          googleId: profile.googleId,
          email: profile.email || null,
          nickname: tempNickname,
          avatarUrl: profile.avatarUrl || null,
          isVerified: true,
        });

        const tokens = await this.generateTokens(user);
        return {
          ...tokens,
          user: {
            id: user.id,
            nickname: user.nickname,
            email: user.email,
            avatarUrl: user.avatarUrl,
            needsNickname: true,
          },
          needsNickname: true,
        };
      }
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ─── Phone / OTP ───────────────────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; expiresIn: number }> {
    const { phoneNumber } = dto;

    // Validate Uzbekistan phone number
    const cleanPhone = phoneNumber.replace(/\s/g, '');
    if (!cleanPhone.match(/^\+998[0-9]{9}$/)) {
      throw new BadRequestException('To\'g\'ri Uzbekiston telefon raqamini kiriting (+998XXXXXXXXX)');
    }

    await this.otpService.sendOtp(cleanPhone);
    return { message: 'Tasdiqlash kodi yuborildi', expiresIn: 300 };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<TokensDto & { needsNickname?: boolean }> {
    const isValid = await this.otpService.verifyOtp(dto.phoneNumber, dto.code);
    if (!isValid) throw new BadRequestException('Kod noto\'g\'ri yoki muddati o\'tgan');

    let user = await this.usersService.findByPhone(dto.phoneNumber);
    let needsNickname = false;

    if (!user) {
      // New user
      const tempNickname = await this.usersService.generateUniqueNickname(
        `Player${Math.floor(Math.random() * 9999)}`,
      );
      user = await this.usersService.create({
        phoneNumber: dto.phoneNumber,
        nickname: tempNickname,
        isVerified: true,
      });
      needsNickname = true;
    } else {
      user.isVerified = true;
      await this.usersService.save(user);
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: {
        id: user.id,
        nickname: user.nickname,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        needsNickname,
      },
      needsNickname,
    };
  }

  // ─── Set Nickname (after first login) ─────────────────────────────────────

  async setNickname(userId: string, dto: SetNicknameDto): Promise<TokensDto> {
    const { available } = await this.usersService.checkNicknameAvailable(dto.nickname);
    if (!available) throw new ConflictException('Bu nickname band');

    const user = await this.usersService.updateProfile(userId, { nickname: dto.nickname });
    const fullUser = await this.usersService.findById(userId);
    const tokens = await this.generateTokens(fullUser);

    return {
      ...tokens,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  // ─── Token management ─────────────────────────────────────────────────────

  async refreshTokens(userId: string, refreshToken: string): Promise<TokensDto> {
    const isValid = await this.usersService.verifyRefreshToken(userId, refreshToken);
    if (!isValid) throw new UnauthorizedException('Refresh token noto\'g\'ri');

    const user = await this.usersService.findById(userId);
    return this.generateTokens(user);
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Muvaffaqiyatli chiqildi' };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async generateTokens(user: User): Promise<Omit<TokensDto, 'user'> & { user: any }> {
    const payload = { sub: user.id, nickname: user.nickname };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES', '30d'),
      }),
    ]);

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async validateSocketToken(token: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
      });
      return this.usersService.findById(payload.sub);
    } catch {
      return null;
    }
  }
}
