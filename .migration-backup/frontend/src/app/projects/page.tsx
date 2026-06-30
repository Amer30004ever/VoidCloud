"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { AddItemButton } from "@/components/ui/create-item-dialog";
import { FolderGit2, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "@/lib/projects";

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });

  return (
    <AppLayout>
      <PageHeader
        title="Projects"
        description="Manage your DevOps projects and repositories"
        action={
          <AddItemButton
            label="New Project"
            title="Create Project"
            description="Set up a new DevOps project workspace."
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            fields={[
              { name: "name", label: "Project Name", placeholder: "voidcloud", required: true },
              { name: "repository", label: "Repository URL", placeholder: "https://github.com/org/repo" },
              { name: "namespace", label: "Namespace", placeholder: "voidcloud" },
            ]}
            onSubmit={async (values) => {
              await projectsApi.create({
                name: values.name,
                repository: values.repository,
                namespace: values.namespace,
                description: values.description,
              });
              await queryClient.invalidateQueries({ queryKey: ["projects"] });
            }}
          />
        }
      />
      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderGit2 className="h-6 w-6" />}
            title="No projects yet"
            description="Create your first project to start managing deployments"
            className="py-20"
          />
        ) : (
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <div key={project.id} className="px-4 py-4">
                <h3 className="text-sm font-medium text-foreground">{project.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {project.repository ?? "No repository"} • {project.namespace ?? "default"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
