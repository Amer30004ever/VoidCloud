import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(userId: string, createApiKeyDto: CreateApiKeyDto): Promise<ApiKey> {
    const key = `sk_${uuidv4().replace(/-/g, '')}`;
    const apiKey = this.apiKeyRepository.create({
      ...createApiKeyDto,
      userId,
      key,
    });
    return this.apiKeyRepository.save(apiKey);
  }

  async findAll(userId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({ where: { userId } });
  }

  async findOne(id: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) {
      throw new NotFoundException(`API Key with ID ${id} not found`);
    }
    return apiKey;
  }

  async findByKey(key: string): Promise<ApiKey | null> {
    return this.apiKeyRepository.findOne({ where: { key } });
  }

  async regenerate(id: string, userId: string): Promise<ApiKey> {
    const apiKey = await this.findOne(id);
    if (apiKey.userId !== userId) {
      throw new NotFoundException('API Key not found');
    }
    apiKey.key = `sk_${uuidv4().replace(/-/g, '')}`;
    return this.apiKeyRepository.save(apiKey);
  }

  async delete(id: string, userId: string, role: string): Promise<void> {
    const apiKey = await this.findOne(id);
    if (apiKey.userId !== userId && role !== 'super_admin' && role !== 'admin') {
      throw new NotFoundException('API Key not found');
    }
    await this.apiKeyRepository.delete(id);
  }

  async updateLastUsed(key: string): Promise<void> {
    await this.apiKeyRepository.update({ key }, { lastUsedAt: new Date() });
  }
}
