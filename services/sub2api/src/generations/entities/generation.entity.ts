import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';

@Entity('generations')
export class Generation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  prompt: string | null;

  @Column({ type: 'jsonb', nullable: true })
  generatedFiles: Record<string, string> | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'int', default: 0 })
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
