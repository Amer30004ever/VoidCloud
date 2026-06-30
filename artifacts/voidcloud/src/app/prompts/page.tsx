
import { Sparkles } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function SavedPromptsPage() {
  return (
    <ResourcePage
      storageKey="amer.prompts"
      title="Saved Prompts"
      subtitle="Reusable AI prompts for chat and assistant flows."
      icon={<Sparkles className="h-6 w-6 text-primary" />}
      searchKeys={["title", "body", "category"]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "category", label: "Category", type: "select", options: ["Review", "Debug", "Refactor", "Docs", "Explain", "Other"] },
        { name: "body", label: "Prompt", type: "textarea", required: true },
      ]}
    />
  );
}
