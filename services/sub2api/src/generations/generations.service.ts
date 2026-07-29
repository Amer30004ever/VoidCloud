import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Generation } from '../generations/entities/generation.entity';
import { Project, ProjectStatus } from '../projects/entities/project.entity';
import { CreateGenerationDto } from './dto/create-generation.dto';

@Injectable()
export class GenerationsService {
  constructor(
    @InjectRepository(Generation)
    private readonly generations: Repository<Generation>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
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

    setTimeout(() => this.processGeneration(saved.id), 100);
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

  private async processGeneration(generationId: string) {
    const generation = await this.generations.findOne({ where: { id: generationId } });
    if (!generation) return;

    const started = Date.now();
    generation.status = 'running';
    await this.generations.save(generation);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      generation.status = 'completed';
      generation.generatedFiles = {
        'package.json': '{"name":"generated-app","version":"0.1.0","private":true}',
        'src/App.tsx': 'export default function App() { return <div>Hello World</div>; }',
        'src/main.tsx': 'import React from "react"; import ReactDOM from "react-dom/client"; import App from "./App"; ReactDOM.createRoot(document.getElementById("root")!).render(<App />);',
        'src/index.css': 'body { margin: 0; font-family: system-ui; }',
        'index.html': '<!DOCTYPE html><html><head><title>Generated App</title></head><body><div id="root"></div></body></html>',
        'README.md': '# Generated App\n\nRun `npm install && npm run dev` to start.',
      };
      generation.durationMs = Date.now() - started;
      await this.generations.save(generation);

      const project = await this.projects.findOne({ where: { id: generation.projectId } });
      if (project) {
        project.status = ProjectStatus.READY;
        await this.projects.save(project);
      }
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
