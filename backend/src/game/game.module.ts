import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { GamePlayer } from './entities/game-player.entity';
import { Message } from './entities/message.entity';
import { Vote } from './entities/vote.entity';
import { Room } from '../rooms/entities/room.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Room, GamePlayer, Message, Vote]),
    RoomsModule,
    UsersModule,
    AuthModule,
  ],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
