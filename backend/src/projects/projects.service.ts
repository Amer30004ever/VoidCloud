import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId?: string) {
    const projects = await this.prisma.project.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return { projects };
  }

  async create(data: { name: string; description?: string; repository?: string; namespace?: string; userId: string }) {
    const project = await this.prisma.project.create({ data });
    return { success: true, project };
  }

  async get(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return { project };
  }

  async remove(id: string) {
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }
}
