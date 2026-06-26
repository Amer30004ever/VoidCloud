import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PipelinesService } from './pipelines.service';

@ApiTags('Pipelines')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('pipelines')
export class PipelinesController {
  constructor(private pipelinesService: PipelinesService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger a pipeline (GitHub/GitLab)' })
  async triggerPipeline(@Body() body: any) {
    // body: { provider, owner, repo, workflowId, ref, inputs, initiatedBy }
    const result = await this.pipelinesService.triggerPipeline(body);
    return { success: true, deployment: result };
  }

  @Get('history')
  @ApiOperation({ summary: 'List deployment history' })
  async listHistory(@Query('limit') limit?: string) {
    const items = await this.pipelinesService.listDeploymentHistory(
      limit ? parseInt(limit) : 50,
    );
    return { count: items.length, items };
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'Get deployment history item' })
  async getHistoryItem(@Param('id') id: string) {
    const item = await this.pipelinesService.getDeploymentById(id);
    return { item };
  }

  @Put('history/:id/status')
  @ApiOperation({ summary: 'Update deployment status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; details?: any },
  ) {
    const updated = await this.pipelinesService.updateDeploymentStatus(
      id,
      body.status,
      body.details,
    );
    return { success: true, updated };
  }

  @Post('rollback/:id')
  @ApiOperation({ summary: 'Rollback to a previous deployment' })
  async rollbackDeployment(@Param('id') id: string) {
    const result = await this.pipelinesService.rollbackDeployment(id);
    return { success: true, deployment: result };
  }

  @Post('custom')
  @ApiOperation({ summary: 'Create a custom deployment pipeline' })
  async createCustomPipeline(@Body() body: any) {
    // body: { name, provider, owner, repo, workflowId, ref, description, enabled }
    const result = await this.pipelinesService.createCustomPipeline(body);
    return { success: true, pipeline: result };
  }

  @Get('workflows/:owner/:repo')
  @ApiOperation({ summary: 'Get recent workflow runs from GitHub' })
  async getRecentWorkflows(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.pipelinesService.getRecentWorkflows(
      owner,
      repo,
      limit ? parseInt(limit) : 10,
    );
    return { count: result.length, workflows: result };
  }

  @Get('workflows/:owner/:repo/:runId')
  @ApiOperation({ summary: 'Get workflow status from GitHub' })
  async getWorkflowStatus(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('runId') runId: string,
  ) {
    const result = await this.pipelinesService.getWorkflowStatus(
      owner,
      repo,
      runId,
    );
    return { workflow: result };
  }
}
