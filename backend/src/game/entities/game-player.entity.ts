import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Room } from '../../rooms/entities/room.entity';
import { Message } from './message.entity';
import { Vote } from './vote.entity';

@Entity('game_players')
export class GamePlayer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'room_id' })
  roomId: string;

  @ManyToOne(() => Room, (room) => room.gamePlayers)
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.gamePlayers)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ default: false, name: 'is_imposter' })
  isImposter: boolean;

  @Column({ nullable: true, name: 'assigned_word' })
  assignedWord: string;

  @Column({ default: false, name: 'is_eliminated' })
  isEliminated: boolean;

  @Column({ default: false, name: 'is_connected' })
  isConnected: boolean;

  @Column({ default: 0, name: 'turn_order' })
  turnOrder: number;

  @Column({ default: 0, name: 'messages_count' })
  messagesCount: number;

  @Column({ default: 0, name: 'votes_received' })
  votesReceived: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @OneToMany(() => Message, (msg) => msg.gamePlayer)
  messages: Message[];

  @OneToMany(() => Vote, (vote) => vote.voter)
  votesGiven: Vote[];

  @OneToMany(() => Vote, (vote) => vote.target)
  votesAgainst: Vote[];
}
