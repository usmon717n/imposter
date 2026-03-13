import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEmail,
  MinLength as Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'CoolNinja42', minLength: 3, maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Nickname faqat harf, raqam va _ dan iborat bo\'lishi kerak' })
  nickname?: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class CheckNicknameDto {
  @ApiProperty({ example: 'CoolNinja42' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Nickname faqat harf, raqam va _ dan iborat bo\'lishi kerak' })
  nickname: string;
}

export class UserResponseDto {
  id: string;
  nickname: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  gamesPlayed: number;
  wins: number;
  timesImposter: number;
  imposterWins: number;
  createdAt: Date;
  lastSeen?: Date;
}
