
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { useQuery } from "@tanstack/react-query";
import { githubApi } from "@/lib/github";
import { GitBranch, Star, GitPullRequest, AlertCircle, PlayCircle } from "lucide-react";
import { useState, useMemo } from "react";

export default function GithubPage() {
  const me = useQuery({ queryKey: ["gh", "user"], queryFn: githubApi.getUser });
  const repos = useQuery({ queryKey: ["gh", "repos"], queryFn: githubApi.listUserRepos });
  const [selected, setSelected] = useState<string | null>(null);

  const repo = useMemo(() => repos.data?.find((r) => r.full_name === selected) ?? null, [repos.data, selected]);
  const owner = repo?.full_name.split("/")[0] ?? "";
  const name = repo?.name ?? "";

  const branches = useQuery({ queryKey: ["gh", selected, "branches"], queryFn: () => githubApi.listBranches(owner, name), enabled: !!repo });
  const pulls = useQuery({ queryKey: ["gh", selected, "pulls"], queryFn: () => githubApi.listPulls(owner, name), enabled: !!repo });
  const issues = useQuery({ queryKey: ["gh", selected, "issues"], queryFn: () => githubApi.listIssues(owner, name), enabled: !!repo });
  const actions = useQuery({ queryKey: ["gh", selected, "actions"], queryFn: () => githubApi.listActions(owner, name), enabled: !!repo });

  return (
    <AppLayout>
      <PageHeader
        title="GitHub"
        description={me.data ? `Signed in as ${me.data.login}` : "Connected GitHub account."}
      />

      {repos.isLoading ? (
        <LoadingState />
      ) : repos.error ? (
        <ErrorState message={(repos.error as Error).message} />
      ) : !repos.data?.length ? (
        <EmptyState icon={<GitBranch className="h-6 w-6" />} title="No repositories" description="Link a GitHub account to load repos" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              Repositories ({repos.data.length})
            </div>
            <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
              {repos.data.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.full_name)}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${selected === r.full_name ? "bg-muted" : ""}`}
                >
                  <p className="truncate font-medium">{r.full_name}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Star className="h-3 w-3" /> {r.stargazers_count} • {r.language ?? "—"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {!repo ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Select a repository on the left.
              </div>
            ) : (
              <>
                <RepoCard label={`${repo.full_name} • default: ${repo.default_branch}`} />
                <Block title="Branches" icon={<GitBranch className="h-4 w-4" />} query={branches}>
                  {(b) => <Row key={b.name} title={b.name} subtitle={b.commit.sha.slice(0, 8) + (b.protected ? " • protected" : "")} />}
                </Block>
                <Block title="Pull requests" icon={<GitPullRequest className="h-4 w-4" />} query={pulls}>
                  {(p) => <Row key={p.number} title={`#${p.number} ${p.title}`} subtitle={`${p.state} • ${p.user.login}`} />}
                </Block>
                <Block title="Issues" icon={<AlertCircle className="h-4 w-4" />} query={issues}>
                  {(i) => <Row key={i.number} title={`#${i.number} ${i.title}`} subtitle={`${i.state} • ${i.user.login}`} />}
                </Block>
                <Block title="Actions" icon={<PlayCircle className="h-4 w-4" />} query={actions}>
                  {(a) => <Row key={a.id} title={`#${a.run_number} ${a.name}`} subtitle={`${a.status}${a.conclusion ? ` • ${a.conclusion}` : ""} • ${a.head_branch}`} />}
                </Block>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function RepoCard({ label }: { label: string }) {
  return <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm">{label}</div>;
}

function Block<T>({
  title,
  icon,
  query,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  query: { data?: T[]; isLoading: boolean; error: unknown };
  children: (item: T) => React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-sm font-medium">
        {icon} {title} {query.data ? <span className="text-xs text-muted-foreground">({query.data.length})</span> : null}
      </div>
      {query.isLoading ? (
        <LoadingState size="sm" />
      ) : query.error ? (
        <ErrorState message={(query.error as Error).message} />
      ) : !query.data?.length ? (
        <EmptyState title={`No ${title.toLowerCase()}`} />
      ) : (
        <div className="max-h-72 divide-y divide-border overflow-y-auto">{query.data.map(children)}</div>
      )}
    </div>
  );
}

function Row({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 py-2">
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
