import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApiKey } from '../../api-keys/entities/api-key.entity';

@Entity('usage_logs')
export class UsageLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  apiKeyId: string;

  @Column()
  endpoint: string;

  @Column()
  method: string;

  @Column({ default: 0 })
  requestTokens: number;

  @Column({ default: 0 })
  responseTokens: number;

  @Column({ default: 0 })
  totalTokens: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  cost: number;

  @Column({ nullable: true })
  statusCode: number;

  @Column({ nullable: true })
  responseTimeMs: number;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true, type: 'text' })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ApiKey)
  @JoinColumn({ name: 'apiKeyId' })
  apiKey: ApiKey;
}
