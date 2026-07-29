import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ProjectStatus {
  DRAFT = 'draft',
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.DRAFT,
  })
  status: ProjectStatus;

  @Column({ type: 'jsonb', nullable: true })
  inferredSchema: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', nullable: true })
  supabaseProject: {
    id?: string;
    url?: string;
    anonKey?: string;
    status?: string;
  } | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;
}
