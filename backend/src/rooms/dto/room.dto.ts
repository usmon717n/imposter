import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ enum: [5, 10, 15], default: 10 })
  @IsInt()
  @IsIn([5, 10, 15])
  durationMinutes: number;

  @ApiPropertyOptional({ minimum: 3, maximum: 10, default: 6 })
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(10)
  maxPlayers?: number;

  @ApiPropertyOptional({ example: 'animals' })
  @IsOptional()
  @IsString()
  wordCategory?: string;
}

export class JoinRoomDto {
  @ApiProperty({ example: 'ABC123' })
  @IsString()
  @Length(6, 6)
  roomCode: string;
}

export class InvitePlayerDto {
  @ApiProperty({ example: 'CoolNinja42' })
  @IsString()
  nickname: string;
}

export class RoomResponseDto {
  id: string;
  roomCode: string;
  hostId: string;
  status: string;
  durationMinutes: number;
  maxPlayers: number;
  players: PlayerInRoomDto[];
  createdAt: Date;
}

export class PlayerInRoomDto {
  id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  isHost: boolean;
  isConnected: boolean;
  turnOrder: number;
}
