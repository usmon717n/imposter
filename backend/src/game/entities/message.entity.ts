import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { GamePlayer } from './game-player.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @Column({ name: 'game_player_id' })
  gamePlayerId: string;

  @ManyToOne(() => GamePlayer, (gp) => gp.messages)
  @JoinColumn({ name: 'game_player_id' })
  gamePlayer: GamePlayer;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 0, name: 'turn_number' })
  turnNumber: number;

  @CreateDateColumn({ name: 'sent_at' })
  sentAt: Date;
}
