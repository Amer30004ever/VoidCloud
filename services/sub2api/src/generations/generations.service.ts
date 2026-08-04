import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Generation } from '../generations/entities/generation.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { CreateGenerationDto } from './dto/create-generation.dto';
import { CodegenService } from '../codegen/codegen.service';

@Injectable()
export class GenerationsService {
  constructor(
    @InjectRepository(Generation)
    private readonly generations: Repository<Generation>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly codegen: CodegenService,
  ) {}

  async findAll(projectId: string, userId: string, userRole: string) {
    await this.verifyProjectAccess(projectId, userId, userRole);
    return this.generations.find({ where: { projectId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, projectId: string, userId: string, userRole: string) {
    await this.verifyProjectAccess(projectId, userId, userRole);
    const generation = await this.generations.findOne({ where: { id } });
    if (!generation) throw new NotFoundException('Generation not found');
    return generation;
  }

  /** Returns a zip archive of a completed generation's files. */
  async archive(id: string, userId: string, userRole: string) {
    const generation = await this.generations.findOne({ where: { id } });
    if (!generation) throw new NotFoundException('Generation not found');
    await this.verifyProjectAccess(generation.projectId, userId, userRole, true);
    if (generation.status !== 'completed' || !generation.generatedFiles) {
      throw new NotFoundException('Generation has no files to download');
    }
    const project = await this.projects.findOne({ where: { id: generation.projectId } });
    const filename = `${(project?.name || 'generated-app')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'generated-app'}.zip`;
    return { filename, buffer: this.codegen.archive(generation.generatedFiles) };
  }

  async create(projectId: string, userId: string, userRole: string, dto: CreateGenerationDto) {
    await this.verifyProjectAccess(projectId, userId, userRole, true);
    const generation = this.generations.create({
      projectId,
      userId,
      prompt: dto.prompt,
      status: 'pending',
      generatedFiles: null,
      error: null,
      durationMs: 0,
    });
    const saved = await this.generations.save(generation);

    const project = await this.projects.findOne({ where: { id: projectId } });
    if (project) {
      project.status = ProjectStatus.GENERATING;
      await this.projects.save(project);
    }

    setTimeout(() => {
      void this.processGeneration(saved.id, dto.targetFiles);
    }, 100);
    return saved;
  }

  private async verifyProjectAccess(projectId: string, userId: string, userRole: string, throwOnMissing = false) {
    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) {
      if (throwOnMissing) throw new NotFoundException('Project not found');
      return;
    }
    if (userRole !== 'super_admin' && userRole !== 'admin' && project.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async processGeneration(generationId: string, targetFiles?: string[]) {
    const generation = await this.generations.findOne({ where: { id: generationId } });
    if (!generation) return;

    const started = Date.now();
    generation.status = 'running';
    await this.generations.save(generation);

    try {
      const project = await this.projects.findOne({ where: { id: generation.projectId } });
      if (!project) throw new NotFoundException('Project not found');

      const description = generation.prompt || project.description || project.name;

      const previous = await this.generations.findOne({
        where: { projectId: generation.projectId, status: 'completed' },
        order: { createdAt: 'DESC' },
      });

      const { files, schema } = this.codegen.generate({
        projectName: project.name,
        description,
        supabaseUrl: project.supabaseProject?.url ?? null,
        supabaseAnonKey: project.supabaseProject?.anonKey ?? null,
        targetFiles,
        previousFiles: previous?.generatedFiles ?? null,
      });

      generation.status = 'completed';
      generation.generatedFiles = files;
      generation.durationMs = Date.now() - started;
      await this.generations.save(generation);

      project.status = ProjectStatus.READY;
      project.inferredSchema = schema as unknown as Record<string, unknown>;
      project.error = null;
      await this.projects.save(project);
    } catch (error) {
      generation.status = 'failed';
      generation.error = error instanceof Error ? error.message : 'Unknown error';
      generation.durationMs = Date.now() - started;
      await this.generations.save(generation);

      const project = await this.projects.findOne({ where: { id: generation.projectId } });
      if (project) {
        project.status = ProjectStatus.FAILED;
        project.error = generation.error;
        await this.projects.save(project);
      }
    }
  }
}
