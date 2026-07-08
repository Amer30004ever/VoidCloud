import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsageLog } from './entities/usage-log.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageLog)
    private readonly usageLogRepository: Repository<UsageLog>,
  ) {}

  async create(logData: Partial<UsageLog>): Promise<UsageLog> {
    const log = this.usageLogRepository.create(logData);
    return this.usageLogRepository.save(log);
  }

  async findByUser(userId: string): Promise<UsageLog[]> {
    return this.usageLogRepository.find({ where: { userId } });
  }

  async findByApiKey(apiKeyId: string): Promise<UsageLog[]> {
    return this.usageLogRepository.find({ where: { apiKeyId } });
  }
}
