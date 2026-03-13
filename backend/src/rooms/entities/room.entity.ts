import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GamePlayer } from '../../game/entities/game-player.entity';

export type RoomStatus = 'waiting' | 'playing' | 'voting' | 'ended';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 6, name: 'room_code' })
  roomCode: string;

  @Column({ name: 'host_id' })
  hostId: string;

  @ManyToOne(() => User, (user) => user.hostedRooms)
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ default: 'waiting' })
  status: RoomStatus;

  // Settings
  @Column({ default: 10, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ default: 6, name: 'max_players' })
  maxPlayers: number;

  @Column({ nullable: true, name: 'word_category' })
  wordCategory: string;

  // Game state
  @Column({ nullable: true, name: 'started_at' })
  startedAt: Date;

  @Column({ nullable: true, name: 'ended_at' })
  endedAt: Date;

  @Column({ nullable: true, name: 'ends_at' })
  endsAt: Date;

  // Words assigned
  @Column({ nullable: true, name: 'common_word' })
  commonWord: string;

  @Column({ nullable: true, name: 'imposter_word' })
  imposterWord: string;

  // Winner
  @Column({ nullable: true, name: 'winner_role' })
  winnerRole: 'players' | 'imposter';

  // Current turn tracking
  @Column({ default: 0, name: 'current_turn_index' })
  currentTurnIndex: number;

  @Column({ nullable: true, name: 'current_turn_user_id' })
  currentTurnUserId: string;

  @Column({ nullable: true, name: 'turn_started_at' })
  turnStartedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => GamePlayer, (gp) => gp.room)
  gamePlayers: GamePlayer[];
}
