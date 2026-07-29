import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SupabaseProject {
  id: string;
  name: string;
  status: 'CREATED' | 'PROVISIONED' | 'HEALTHY' | 'UNHEALTHY' | 'FAILED';
  dbHost?: string;
  dbPort?: number;
  dbName?: string;
  dbUser?: string;
  apiUrl?: string;
  jwtSecret?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

@Injectable()
export class SupabaseProvisioningService {
  private readonly baseUrl = 'https://api.supabase.com/v1';
  private _accessToken: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get accessToken(): string {
    if (!this._accessToken) {
      const token = this.configService.get<string>('SUPABASE_ORG_TOKEN');
      if (!token) {
        throw new Error('SUPABASE_ORG_TOKEN is not configured');
      }
      this._accessToken = token;
    }
    return this._accessToken;
  }

  async createProject(name: string, region = 'us-east-1'): Promise<SupabaseProject> {
    const url = `${this.baseUrl}/projects`;
    const body = {
      name,
      region,
      organization_id: this.configService.get<string>('SUPABASE_ORG_ID', 'default'),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new HttpException(`Supabase provisioning failed: ${errorText}`, HttpStatus.BAD_REQUEST);
    }

    const project = (await response.json()) as SupabaseProject;
    return {
      ...project,
      status: project.status || 'CREATED',
    };
  }

  async getProject(projectRef: string): Promise<SupabaseProject> {
    const url = `${this.baseUrl}/projects/${projectRef}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new HttpException('Failed to fetch Supabase project', HttpStatus.BAD_REQUEST);
    }

    return response.json() as Promise<SupabaseProject>;
  }

  async waitForHealthy(projectRef: string, maxAttempts = 30): Promise<SupabaseProject> {
    for (let i = 0; i < maxAttempts; i++) {
      const project = await this.getProject(projectRef);
      if (project.status === 'HEALTHY' || project.status === 'PROVISIONED') {
        return project;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new HttpException('Supabase project provisioning timed out', HttpStatus.GATEWAY_TIMEOUT);
  }

  async deleteProject(projectRef: string): Promise<void> {
    const url = `${this.baseUrl}/projects/${projectRef}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      throw new HttpException('Failed to delete Supabase project', HttpStatus.BAD_REQUEST);
    }
  }
}
