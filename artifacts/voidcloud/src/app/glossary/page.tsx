import { BookA } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function GlossaryPage() {
  return (
    <ResourcePage
      storageKey="amer.glossary"
      title="Glossary"
      subtitle="Searchable DevOps terminology."
      icon={<BookA className="h-6 w-6 text-primary" />}
      searchKeys={["term", "definition"]}
      fields={[
        { name: "term", label: "Term", required: true },
        { name: "definition", label: "Definition", type: "textarea", required: true },
        { name: "category", label: "Category", type: "select", options: ["Kubernetes", "Networking", "Security", "CI/CD", "Cloud", "Linux", "Other"] },
      ]}
    />
  );
}
