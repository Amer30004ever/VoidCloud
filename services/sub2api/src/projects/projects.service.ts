import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async findAll(userId: string, userRole: string) {
    const qb = this.projects.createQueryBuilder('project');
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      qb.where('project.userId = :userId', { userId });
    }
    return qb.orderBy('project.createdAt', 'DESC').getMany();
  }

  async findOne(id: string, userId: string, userRole: string) {
    const project = await this.projects.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    if (userRole !== 'super_admin' && userRole !== 'admin' && project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const plan = await this.getUserPlan(userId);
    const currentCount = await this.projects.count({ where: { userId, status: ProjectStatus.READY as any } });

    if (plan === 'free' && currentCount >= 3) {
      throw new ForbiddenException('Free tier limit reached. Upgrade to create more projects.');
    }

    const project = this.projects.create({
      userId,
      name: dto.name,
      description: dto.description || null,
      status: ProjectStatus.DRAFT,
    });
    return this.projects.save(project);
  }

  private async getUserPlan(userId: string): Promise<string> {
    const user = await this.users.findOne({ where: { id: userId } });
    return (user as any)?.plan || 'free';
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id, userId, userRole);
    if (dto.name) project.name = dto.name;
    if (dto.description !== undefined) project.description = dto.description;
    if (dto.status) project.status = dto.status as ProjectStatus;
    return this.projects.save(project);
  }

  async remove(id: string, userId: string, userRole: string) {
    const project = await this.findOne(id, userId, userRole);
    await this.projects.remove(project);
    return { success: true };
  }
}
