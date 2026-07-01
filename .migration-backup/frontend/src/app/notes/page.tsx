"use client";
import { StickyNote } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function NotesPage() {
  return (
    <ResourcePage
      storageKey="amer.notes"
      title="Notes"
      subtitle="Markdown notes, runbook snippets, second brain."
      icon={<StickyNote className="h-6 w-6 text-primary" />}
      searchKeys={["title", "content", "tags"]}
      fields={[
        { name: "title", label: "Title", required: true, placeholder: "Note title" },
        { name: "tags", label: "Tags (comma separated)", placeholder: "k8s, prod, incident" },
        { name: "content", label: "Content (markdown)", type: "textarea", placeholder: "# Heading\nYour notes…" },
      ]}
    />
  );
}
