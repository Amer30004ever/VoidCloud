import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ unique: true })
  key: string;

  @Column()
  name: string;

  @Column({ type: 'jsonb', default: '[]' })
  permissions: string[];

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.apiKeys)
  @JoinColumn({ name: 'userId' })
  user: User;
}
