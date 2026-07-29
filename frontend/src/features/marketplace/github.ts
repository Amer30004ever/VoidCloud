import api from "@/lib/api";

export interface GhUser {
  login: string;
  name?: string;
  avatar_url: string;
  bio?: string;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GhOrg {
  login: string;
  avatar_url: string;
  description?: string;
}

export interface GhRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description?: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  language?: string;
  updated_at: string;
}

export interface GhBranch {
  name: string;
  commit: { sha: string; url: string };
  protected: boolean;
}

export interface GhCommit {
  sha: string;
  message: string;
  author: { name: string; email: string; date: string };
  url: string;
}

export interface GhPullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  user: { login: string };
  created_at: string;
  merged_at?: string | null;
}

export interface GhIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  user: { login: string };
  labels: Array<{ name: string; color: string }>;
  created_at: string;
}

export interface GhActionRun {
  id: number;
  name: string;
  status: string;
  conclusion?: string | null;
  head_branch: string;
  head_sha: string;
  run_number: number;
  created_at: string;
  updated_at: string;
}

export interface GhWebhook {
  id: number;
  url: string;
  events: string[];
  active: boolean;
}

export const githubApi = {
  getUser: async () => {
    const { data } = await api.get<GhUser>("/github/user");
    return data;
  },
  listOrganizations: async () => {
    const { data } = await api.get<{ organizations: GhOrg[] }>("/github/organizations");
    return data.organizations ?? [];
  },
  listUserRepos: async () => {
    const { data } = await api.get<{ repos: GhRepo[] }>("/github/user/repos");
    return data.repos ?? [];
  },
  listRepos: async (params?: { org?: string }) => {
    const qs = params?.org ? `?org=${params.org}` : "";
    const { data } = await api.get<{ repos: GhRepo[] }>(`/github/repos${qs}`);
    return data.repos ?? [];
  },
  getRepo: async (owner: string, repo: string) => {
    const { data } = await api.get<GhRepo>(`/github/repos/${owner}/${repo}`);
    return data;
  },
  listBranches: async (owner: string, repo: string) => {
    const { data } = await api.get<{ branches: GhBranch[] }>(`/github/repos/${owner}/${repo}/branches`);
    return data.branches ?? [];
  },
  listCommits: async (owner: string, repo: string) => {
    const { data } = await api.get<{ commits: GhCommit[] }>(`/github/repos/${owner}/${repo}/commits`);
    return data.commits ?? [];
  },
  listPulls: async (owner: string, repo: string) => {
    const { data } = await api.get<{ pulls: GhPullRequest[] }>(`/github/repos/${owner}/${repo}/pulls`);
    return data.pulls ?? [];
  },
  listIssues: async (owner: string, repo: string) => {
    const { data } = await api.get<{ issues: GhIssue[] }>(`/github/repos/${owner}/${repo}/issues`);
    return data.issues ?? [];
  },
  listActions: async (owner: string, repo: string) => {
    const { data } = await api.get<{ runs: GhActionRun[] }>(`/github/repos/${owner}/${repo}/actions`);
    return data.runs ?? [];
  },
  getAction: async (owner: string, repo: string, runId: number) => {
    const { data } = await api.get<GhActionRun>(`/github/repos/${owner}/${repo}/actions/${runId}`);
    return data;
  },
  rerunAction: async (owner: string, repo: string, runId: number) => {
    const { data } = await api.post<{ success: boolean }>(`/github/repos/${owner}/${repo}/actions/${runId}/rerun`, {});
    return data;
  },
  getAnalytics: async (owner: string, repo: string) => {
    const { data } = await api.get<Record<string, unknown>>(`/github/repos/${owner}/${repo}/analytics`);
    return data;
  },
  listWebhooks: async (owner: string, repo: string) => {
    const { data } = await api.get<{ webhooks: GhWebhook[] }>(`/github/repos/${owner}/${repo}/webhooks`);
    return data.webhooks ?? [];
  },
  createWebhook: async (
    owner: string,
    repo: string,
    payload: { url: string; events: string[]; secret?: string },
  ) => {
    const { data } = await api.post<{ webhook: GhWebhook }>(`/github/repos/${owner}/${repo}/webhooks`, payload);
    return data.webhook;
  },
  deleteWebhook: async (owner: string, repo: string, id: number) => {
    const { data } = await api.delete<{ success: boolean }>(`/github/repos/${owner}/${repo}/webhooks/${id}`);
    return data;
  },
};
