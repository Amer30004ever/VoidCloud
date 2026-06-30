"use client";
import { Briefcase } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function PortfolioPage() {
  return (
    <ResourcePage
      storageKey="amer.portfolio"
      title="Portfolio"
      subtitle="Public showcase of your projects."
      icon={<Briefcase className="h-6 w-6 text-primary" />}
      searchKeys={["name", "stack", "summary"]}
      fields={[
        { name: "name", label: "Project name", required: true },
        { name: "stack", label: "Stack", placeholder: "K8s, Terraform, Go" },
        { name: "summary", label: "Summary", type: "textarea", required: true },
        { name: "repo", label: "Repo URL", type: "url" },
        { name: "demo", label: "Demo URL", type: "url" },
      ]}
    />
  );
}
