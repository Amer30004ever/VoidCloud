import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../activity/entities/activity-log.entity';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly logs: Repository<ActivityLog>,
  ) {}

  async findAll(projectId: string, userId: string, userRole: string) {
    const qb = this.logs.createQueryBuilder('log');
    qb.where('log.projectId = :projectId', { projectId });
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      qb.andWhere('log.userId = :userId', { userId });
    }
    return qb.orderBy('log.createdAt', 'DESC').limit(50).getMany();
  }

  async create(projectId: string, userId: string, action: string, detail?: string, metadata?: Record<string, unknown>) {
    const log = this.logs.create({
      projectId,
      userId,
      action,
      detail: detail || null,
      metadata: metadata || null,
    });
    return this.logs.save(log);
  }
}
