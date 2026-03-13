import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { GamePlayer } from './game-player.entity';

@Unique(['roomId', 'voterId', 'round'])
@Entity('votes')
export class Vote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'voter_id' })
  voterId: string;

  @ManyToOne(() => GamePlayer, (gp) => gp.votesGiven)
  @JoinColumn({ name: 'voter_id' })
  voter: GamePlayer;

  @Column({ name: 'target_id' })
  targetId: string;

  @ManyToOne(() => GamePlayer, (gp) => gp.votesAgainst)
  @JoinColumn({ name: 'target_id' })
  target: GamePlayer;

  @Column({ default: 1 })
  round: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
