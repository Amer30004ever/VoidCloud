import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationService } from './automation.service';

@ApiTags('Automation')
@ApiSecurity('bearer')
@UseGuards(JwtAuthGuard)
@Controller('automation')
export class AutomationController {
  private readonly logger = new Logger(AutomationController.name);

  constructor(private readonly automationService: AutomationService) {}

  // Script Library Endpoints
  @Get('scripts')
  @ApiOperation({ summary: 'Get all scripts' })
  async getScripts(
    @Query('category') category?: string,
    @Query('language') language?: string,
  ) {
    return this.automationService.getScripts(category, language);
  }

  @Get('scripts/:id')
  @ApiOperation({ summary: 'Get script by ID' })
  async getScript(@Param('id') id: string) {
    return this.automationService.getScript(id);
  }

  @Post('scripts')
  @ApiOperation({ summary: 'Create new script' })
  async createScript(@Body() scriptData: any) {
    return this.automationService.createScript(scriptData);
  }

  @Put('scripts/:id')
  @ApiOperation({ summary: 'Update script' })
  async updateScript(@Param('id') id: string, @Body() scriptData: any) {
    return this.automationService.updateScript(id, scriptData);
  }

  @Delete('scripts/:id')
  @ApiOperation({ summary: 'Delete script' })
  async deleteScript(@Param('id') id: string) {
    return this.automationService.deleteScript(id);
  }

  @Post('scripts/:id/execute')
  @ApiOperation({ summary: 'Execute script' })
  async executeScript(
    @Param('id') id: string,
    @Body() params?: Record<string, any>,
  ) {
    return this.automationService.executeScript(id, params);
  }

  // Workflow Templates Endpoints
  @Get('workflows')
  @ApiOperation({ summary: 'Get all workflow templates' })
  async getWorkflowTemplates(@Query('category') category?: string) {
    return this.automationService.getWorkflowTemplates(category);
  }

  @Get('workflows/:id')
  @ApiOperation({ summary: 'Get workflow template by ID' })
  async getWorkflowTemplate(@Param('id') id: string) {
    return this.automationService.getWorkflowTemplate(id);
  }

  @Post('workflows')
  @ApiOperation({ summary: 'Create new workflow template' })
  async createWorkflowTemplate(@Body() templateData: any) {
    return this.automationService.createWorkflowTemplate(templateData);
  }

  @Put('workflows/:id')
  @ApiOperation({ summary: 'Update workflow template' })
  async updateWorkflowTemplate(@Param('id') id: string, @Body() templateData: any) {
    return this.automationService.updateWorkflowTemplate(id, templateData);
  }

  @Delete('workflows/:id')
  @ApiOperation({ summary: 'Delete workflow template' })
  async deleteWorkflowTemplate(@Param('id') id: string) {
    return this.automationService.deleteWorkflowTemplate(id);
  }

  @Post('workflows/:id/execute')
  @ApiOperation({ summary: 'Execute workflow template' })
  async executeWorkflowTemplate(
    @Param('id') id: string,
    @Body() params?: Record<string, any>,
  ) {
    return this.automationService.executeWorkflowTemplate(id, params);
  }
}
