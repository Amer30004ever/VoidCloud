import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Generation } from './entities/generation.entity';
import { Project } from '../projects/entities/project.entity';
import { GenerationsService } from './generations.service';
import { GenerationsController } from './generations.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [TypeOrmModule.forFeature([Generation]), TypeOrmModule.forFeature([Project]), ProjectsModule],
  controllers: [GenerationsController],
  providers: [GenerationsService],
  exports: [GenerationsService],
})
export class GenerationsModule {}
