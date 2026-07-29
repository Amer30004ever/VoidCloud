import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiKey } from '../../api-keys/entities/api-key.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password: string;

  @Column({
    type: 'enum',
    enum: ['super_admin', 'admin', 'admin_client', 'user'],
    default: 'user',
  })
  role: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  supabaseToken: string;

  @Column({ default: 'free' })
  plan: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys: ApiKey[];
}

