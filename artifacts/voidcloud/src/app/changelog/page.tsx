import { GitCommit } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function ChangelogPage() {
  return (
    <ResourcePage
      storageKey="amer.changelog"
      title="Changelog"
      subtitle="Internal release notes per project/service."
      icon={<GitCommit className="h-6 w-6 text-primary" />}
      searchKeys={["service", "version", "notes"]}
      fields={[
        { name: "service", label: "Service", required: true },
        { name: "version", label: "Version", required: true, placeholder: "v1.4.2" },
        { name: "type", label: "Type", type: "select", options: ["Feature", "Fix", "Breaking", "Security", "Chore"] },
        { name: "notes", label: "Release notes", type: "textarea", required: true },
      ]}
    />
  );
}
