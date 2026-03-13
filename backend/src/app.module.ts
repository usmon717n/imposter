import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { GameModule } from './game/game.module';
import { User } from './users/entities/user.entity';
import { Room } from './rooms/entities/room.entity';
import { GamePlayer } from './game/entities/game-player.entity';
import { Message } from './game/entities/message.entity';
import { Vote } from './game/entities/vote.entity';

@Module({
  imports: [
    // Config (env variables)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'imposter_game'),
        entities: [User, Room, GamePlayer, Message, Vote],
        synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 20 },
      { name: 'long', ttl: 3600000, limit: 500 },
    ]),

    // Feature modules
    AuthModule,
    UsersModule,
    RoomsModule,
    GameModule,
  ],
})
export class AppModule {}
