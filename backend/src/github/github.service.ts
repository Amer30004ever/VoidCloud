import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly githubToken: string;
  private readonly githubApiUrl = 'https://api.github.com';

  constructor(private readonly configService: ConfigService) {
    this.githubToken = this.configService.get<string>('GITHUB_TOKEN') || '';
  }

  private getHeaders() {
    return {
      Authorization: `token ${this.githubToken}`,
      Accept: 'application/vnd.github.v3+json',
    };
  }

  async getRepos() {
    try {
      const response = await fetch(`${this.githubApiUrl}/user/repos`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repos = await response.json();

      return {
        repos: repos.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          updatedAt: repo.updated_at,
          createdAt: repo.created_at,
          defaultBranch: repo.default_branch,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching repos: ${error.message}`);
      throw error;
    }
  }

  async getRepoDetails(owner: string, repo: string) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repoData = await response.json();

      return {
        id: repoData.id,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        private: repoData.private,
        language: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        openIssues: repoData.open_issues_count,
        watchers: repoData.watchers_count,
        size: repoData.size,
        defaultBranch: repoData.default_branch,
        license: repoData.license,
        topics: repoData.topics,
        hasWiki: repoData.has_wiki,
        hasPages: repoData.has_pages,
        updatedAt: repoData.updated_at,
        createdAt: repoData.created_at,
        pushedAt: repoData.pushed_at,
      };
    } catch (error) {
      this.logger.error(`Error fetching repo details: ${error.message}`);
      throw error;
    }
  }

  async getCommits(owner: string, repo: string, limit: number = 10) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/commits?per_page=${limit}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const commits = await response.json();

      return {
        commits: commits.map((commit: any) => ({
          sha: commit.sha,
          message: commit.commit.message,
          author: {
            name: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commit.commit.author.date,
          },
          url: commit.html_url,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching commits: ${error.message}`);
      throw error;
    }
  }

  async getBranches(owner: string, repo: string) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/branches`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const branches = await response.json();

      return {
        branches: branches.map((branch: any) => ({
          name: branch.name,
          commit: {
            sha: branch.commit.sha,
            url: branch.commit.url,
          },
          protected: branch.protected,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching branches: ${error.message}`);
      throw error;
    }
  }

  async getPullRequests(owner: string, repo: string, state: string = 'open') {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/pulls?state=${state}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const prs = await response.json();

      return {
        pullRequests: prs.map((pr: any) => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          user: pr.user.login,
          createdAt: pr.created_at,
          updatedAt: pr.updated_at,
          headBranch: pr.head.ref,
          baseBranch: pr.base.ref,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          url: pr.html_url,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching pull requests: ${error.message}`);
      throw error;
    }
  }

  async getIssues(owner: string, repo: string, state: string = 'open') {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/issues?state=${state}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const issues = await response.json();

      return {
        issues: issues.map((issue: any) => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          user: issue.user.login,
          labels: issue.labels.map((label: any) => ({
            name: label.name,
            color: label.color,
          })),
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          comments: issue.comments,
          url: issue.html_url,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching issues: ${error.message}`);
      throw error;
    }
  }

  async getWorkflowRuns(owner: string, repo: string, limit: number = 10) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/actions/runs?per_page=${limit}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        workflowRuns: data.workflow_runs.map((run: any) => ({
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          createdAt: run.created_at,
          updatedAt: run.updated_at,
          event: run.event,
          headBranch: run.head_branch,
          headCommit: run.head_commit.message,
          url: run.html_url,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching workflow runs: ${error.message}`);
      throw error;
    }
  }

  async getWorkflowRunDetails(owner: string, repo: string, runId: number) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/actions/runs/${runId}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const run = await response.json();

      return {
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        event: run.event,
        headBranch: run.head_branch,
        headCommit: run.head_commit,
        jobs: run.jobs || [],
        logsUrl: run.logs_url,
        url: run.html_url,
      };
    } catch (error) {
      this.logger.error(
        `Error fetching workflow run details: ${error.message}`,
      );
      throw error;
    }
  }

  async rerunWorkflow(owner: string, repo: string, runId: number) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return { success: true, message: 'Workflow rerun triggered' };
    } catch (error) {
      this.logger.error(`Error rerunning workflow: ${error.message}`);
      throw error;
    }
  }

  async getWebhooks(owner: string, repo: string) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/hooks`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const hooks = await response.json();

      return {
        webhooks: hooks.map((hook: any) => ({
          id: hook.id,
          url: hook.config.url,
          events: hook.events,
          active: hook.active,
          createdAt: hook.created_at,
          updatedAt: hook.updated_at,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching webhooks: ${error.message}`);
      throw error;
    }
  }

  async createWebhook(owner: string, repo: string, webhookData: any) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/hooks`,
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            name: 'web',
            config: {
              url: webhookData.url,
              content_type: 'json',
              secret: webhookData.secret || '',
            },
            events: webhookData.events || ['push'],
            active: true,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const hook = await response.json();

      return {
        success: true,
        webhook: {
          id: hook.id,
          url: hook.config.url,
          events: hook.events,
        },
      };
    } catch (error) {
      this.logger.error(`Error creating webhook: ${error.message}`);
      throw error;
    }
  }

  async deleteWebhook(owner: string, repo: string, webhookId: number) {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/hooks/${webhookId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      return { success: true, message: 'Webhook deleted' };
    } catch (error) {
      this.logger.error(`Error deleting webhook: ${error.message}`);
      throw error;
    }
  }

  async getRepoAnalytics(owner: string, repo: string) {
    try {
      // Get basic repo stats
      const repoResponse = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}`,
        {
          headers: this.getHeaders(),
        },
      );

      const repoData = await repoResponse.json();

      // Get contributors
      const contributorsResponse = await fetch(
        `${this.githubApiUrl}/repos/${owner}/${repo}/contributors`,
        {
          headers: this.getHeaders(),
        },
      );

      const contributors = await contributorsResponse.json();

      return {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        openIssues: repoData.open_issues_count,
        contributors: contributors.slice(0, 10).map((c: any) => ({
          login: c.login,
          contributions: c.contributions,
        })),
        language: repoData.language,
        size: repoData.size,
      };
    } catch (error) {
      this.logger.error(`Error fetching repo analytics: ${error.message}`);
      throw error;
    }
  }

  async getUser() {
    try {
      const response = await fetch(`${this.githubApiUrl}/user`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const user = await response.json();

      return {
        id: user.id,
        login: user.login,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        location: user.location,
        company: user.company,
        blog: user.blog,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        createdAt: user.created_at,
      };
    } catch (error) {
      this.logger.error(`Error fetching user: ${error.message}`);
      throw error;
    }
  }

  async getUserRepos(type: string = 'all', sort: string = 'updated') {
    try {
      const response = await fetch(
        `${this.githubApiUrl}/user/repos?type=${type}&sort=${sort}`,
        {
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repos = await response.json();

      return {
        repos: repos.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          private: repo.private,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          updatedAt: repo.updated_at,
          createdAt: repo.created_at,
          defaultBranch: repo.default_branch,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching user repos: ${error.message}`);
      throw error;
    }
  }

  async getOrganizations() {
    try {
      const response = await fetch(`${this.githubApiUrl}/user/orgs`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const orgs = await response.json();

      return {
        organizations: orgs.map((org: any) => ({
          id: org.id,
          login: org.login,
          description: org.description,
          avatarUrl: org.avatar_url,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching organizations: ${error.message}`);
      throw error;
    }
  }
}
