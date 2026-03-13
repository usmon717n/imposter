import { IsString, IsOptional, Length, Matches, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'Telefon raqam (xalqaro format)' })
  @IsString()
  phoneNumber: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: '6 raqamli tasdiqlash kodi' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class SetNicknameDto {
  @ApiProperty({ example: 'CoolNinja42', minLength: 3, maxLength: 20 })
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nickname faqat harf, raqam va _ belgisidan iborat bo\'lishi kerak',
  })
  nickname: string;
}

export class GoogleCallbackDto {
  @ApiProperty({ description: 'Google OAuth code' })
  @IsString()
  code: string;
}

export class TokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  user: {
    id: string;
    nickname: string;
    email?: string;
    phoneNumber?: string;
    avatarUrl?: string;
    needsNickname?: boolean;
  };
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
