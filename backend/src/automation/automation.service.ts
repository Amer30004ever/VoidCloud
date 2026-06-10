import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface Script {
  id: string;
  name: string;
  description: string;
  language: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  userId: string;
}

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private prisma: PrismaService) {}

  // Script Library Methods
  async getScripts(category?: string, language?: string) {
    try {
      const where: any = {};
      if (category) where.category = category;
      if (language) where.language = language;

      const scripts = await this.prisma.script.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      return { scripts };
    } catch (error) {
      this.logger.error(`Error fetching scripts: ${error.message}`);
      throw error;
    }
  }

  async getScript(id: string) {
    try {
      const script = await this.prisma.script.findUnique({
        where: { id },
      });
      return { script };
    } catch (error) {
      this.logger.error(`Error fetching script: ${error.message}`);
      throw error;
    }
  }

  async createScript(scriptData: {
    name: string;
    description: string;
    language: string;
    content: string;
    category: string;
    tags: string[];
    userId: string;
  }) {
    try {
      const script = await this.prisma.script.create({
        data: scriptData,
      });
      return { success: true, script };
    } catch (error) {
      this.logger.error(`Error creating script: ${error.message}`);
      throw error;
    }
  }

  async updateScript(id: string, scriptData: any) {
    try {
      const script = await this.prisma.script.update({
        where: { id },
        data: scriptData,
      });
      return { success: true, script };
    } catch (error) {
      this.logger.error(`Error updating script: ${error.message}`);
      throw error;
    }
  }

  async deleteScript(id: string) {
    try {
      await this.prisma.script.delete({
        where: { id },
      });
      return { success: true, message: 'Script deleted' };
    } catch (error) {
      this.logger.error(`Error deleting script: ${error.message}`);
      throw error;
    }
  }

  async executeScript(id: string, params?: Record<string, any>) {
    try {
      const script = await this.prisma.script.findUnique({
        where: { id },
      });
      
      if (!script) {
        throw new Error('Script not found');
      }

      // For now, return a mock execution result
      // In production, this would execute the actual script
      const result = {
        output: `Script ${script.name} executed successfully`,
        exitCode: 0,
        executionTime: '1.2s',
      };

      return { success: true, result };
    } catch (error) {
      this.logger.error(`Error executing script: ${error.message}`);
      throw error;
    }
  }

  // Workflow Templates Methods
  async getWorkflowTemplates(category?: string) {
    try {
      const where: any = {};
      if (category) where.category = category;

      const templates = await this.prisma.workflowTemplate.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
      });
      return { templates };
    } catch (error) {
      this.logger.error(`Error fetching workflow templates: ${error.message}`);
      throw error;
    }
  }

  async getWorkflowTemplate(id: string) {
    try {
      const template = await this.prisma.workflowTemplate.findUnique({
        where: { id },
      });
      return { template };
    } catch (error) {
      this.logger.error(`Error fetching workflow template: ${error.message}`);
      throw error;
    }
  }

  async createWorkflowTemplate(templateData: any) {
    try {
      const template = await this.prisma.workflowTemplate.create({
        data: templateData,
      });
      return { success: true, template };
    } catch (error) {
      this.logger.error(`Error creating workflow template: ${error.message}`);
      throw error;
    }
  }

  async updateWorkflowTemplate(id: string, templateData: any) {
    try {
      const template = await this.prisma.workflowTemplate.update({
        where: { id },
        data: templateData,
      });
      return { success: true, template };
    } catch (error) {
      this.logger.error(`Error updating workflow template: ${error.message}`);
      throw error;
    }
  }

  async deleteWorkflowTemplate(id: string) {
    try {
      await this.prisma.workflowTemplate.delete({
        where: { id },
      });
      return { success: true, message: 'Workflow template deleted' };
    } catch (error) {
      this.logger.error(`Error deleting workflow template: ${error.message}`);
      throw error;
    }
  }

  async executeWorkflowTemplate(id: string, params?: Record<string, any>) {
    try {
      const template = await this.prisma.workflowTemplate.findUnique({
        where: { id },
      });
      
      if (!template) {
        throw new Error('Workflow template not found');
      }

      // For now, return a mock execution result
      const result = {
        output: `Workflow ${template.name} executed successfully`,
        status: 'completed',
        executionTime: '5.3s',
      };

      return { success: true, result };
    } catch (error) {
      this.logger.error(`Error executing workflow template: ${error.message}`);
      throw error;
    }
  }
}
