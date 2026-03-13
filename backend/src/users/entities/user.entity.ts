import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { GamePlayer } from '../../game/entities/game-player.entity';
import { Room } from '../../rooms/entities/room.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  nickname: string;

  @Index()
  @Column({ nullable: true, unique: true })
  email: string;

  @Index()
  @Column({ nullable: true, unique: true, name: 'phone_number' })
  phoneNumber: string;

  @Exclude()
  @Column({ nullable: true, name: 'password_hash' })
  passwordHash: string;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @Column({ nullable: true, name: 'google_id' })
  googleId: string;

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  // Stats
  @Column({ default: 0, name: 'games_played' })
  gamesPlayed: number;

  @Column({ default: 0 })
  wins: number;

  @Column({ default: 0, name: 'times_imposter' })
  timesImposter: number;

  @Column({ default: 0, name: 'imposter_wins' })
  imposterWins: number;

  @Column({ nullable: true, name: 'nickname_changed_at' })
  nicknameChangedAt: Date;

  @Column({ nullable: true, name: 'last_seen' })
  lastSeen: Date;

  @Column({ nullable: true, name: 'refresh_token_hash' })
  @Exclude()
  refreshTokenHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => GamePlayer, (gp) => gp.user)
  gamePlayers: GamePlayer[];

  @OneToMany(() => Room, (room) => room.host)
  hostedRooms: Room[];
}
