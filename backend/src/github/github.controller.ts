import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { GithubService } from './github.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@ApiTags('GitHub')
@Controller('github')
@UseGuards(JwtAuthGuard)
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Get('repos')
  @ApiOperation({ summary: 'Get all repositories for authenticated user' })
  @ApiOkResponse({
    description: 'Returns list of repositories with status and metadata',
  })
  async getRepos() {
    return this.githubService.getRepos();
  }

  @Get('repos/:owner/:repo')
  @ApiOperation({ summary: 'Get details for a specific repository' })
  async getRepoDetails(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.githubService.getRepoDetails(owner, repo);
  }

  @Get('repos/:owner/:repo/commits')
  @ApiOperation({ summary: 'Get commit history for a repository' })
  async getCommits(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('limit') limit?: string,
  ) {
    return this.githubService.getCommits(owner, repo, limit ? parseInt(limit) : 10);
  }

  @Get('repos/:owner/:repo/branches')
  @ApiOperation({ summary: 'Get all branches for a repository' })
  async getBranches(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.githubService.getBranches(owner, repo);
  }

  @Get('repos/:owner/:repo/pulls')
  @ApiOperation({ summary: 'Get pull requests for a repository' })
  async getPullRequests(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('state') state?: string,
  ) {
    return this.githubService.getPullRequests(owner, repo, state || 'open');
  }

  @Get('repos/:owner/:repo/issues')
  @ApiOperation({ summary: 'Get issues for a repository' })
  async getIssues(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('state') state?: string,
  ) {
    return this.githubService.getIssues(owner, repo, state || 'open');
  }

  @Get('repos/:owner/:repo/actions')
  @ApiOperation({ summary: 'Get GitHub Actions workflow runs' })
  async getWorkflowRuns(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('limit') limit?: string,
  ) {
    return this.githubService.getWorkflowRuns(owner, repo, limit ? parseInt(limit) : 10);
  }

  @Get('repos/:owner/:repo/actions/:run_id')
  @ApiOperation({ summary: 'Get details for a specific workflow run' })
  async getWorkflowRunDetails(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('run_id') runId: string,
  ) {
    return this.githubService.getWorkflowRunDetails(owner, repo, parseInt(runId));
  }

  @Post('repos/:owner/:repo/actions/:run_id/rerun')
  @ApiOperation({ summary: 'Rerun a failed workflow' })
  async rerunWorkflow(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('run_id') runId: string,
  ) {
    return this.githubService.rerunWorkflow(owner, repo, parseInt(runId));
  }

  @Get('repos/:owner/:repo/webhooks')
  @ApiOperation({ summary: 'Get webhooks for a repository' })
  async getWebhooks(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.githubService.getWebhooks(owner, repo);
  }

  @Post('repos/:owner/:repo/webhooks')
  @ApiOperation({ summary: 'Create webhook for auto-deployment' })
  async createWebhook(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() webhookData: any,
  ) {
    return this.githubService.createWebhook(owner, repo, webhookData);
  }

  @Delete('repos/:owner/:repo/webhooks/:id')
  @ApiOperation({ summary: 'Delete webhook' })
  async deleteWebhook(
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('id') webhookId: string,
  ) {
    return this.githubService.deleteWebhook(owner, repo, parseInt(webhookId));
  }

  @Get('repos/:owner/:repo/analytics')
  @ApiOperation({ summary: 'Get repository analytics' })
  async getRepoAnalytics(@Param('owner') owner: string, @Param('repo') repo: string) {
    return this.githubService.getRepoAnalytics(owner, repo);
  }

  @Get('user')
  @ApiOperation({ summary: 'Get authenticated GitHub user info' })
  async getUser() {
    return this.githubService.getUser();
  }

  @Get('user/repos')
  @ApiOperation({ summary: 'Get user repositories with enhanced metadata' })
  async getUserRepos(
    @Query('type') type?: string,
    @Query('sort') sort?: string,
  ) {
    return this.githubService.getUserRepos(type || 'all', sort || 'updated');
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Get user organizations' })
  async getOrganizations() {
    return this.githubService.getOrganizations();
  }
}
