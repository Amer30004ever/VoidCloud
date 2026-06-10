"use client";
import { BookOpen } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function RunbooksPage() {
  return (
    <ResourcePage
      storageKey="amer.runbooks"
      title="Runbooks"
      subtitle="Step-by-step incident response playbooks."
      icon={<BookOpen className="h-6 w-6 text-primary" />}
      searchKeys={["title", "service", "steps", "severity"]}
      fields={[
        { name: "title", label: "Title", required: true, placeholder: "Postgres failover" },
        { name: "service", label: "Service / System" },
        { name: "severity", label: "Severity", type: "select", options: ["P1", "P2", "P3", "P4"] },
        { name: "steps", label: "Steps (markdown checklist)", type: "textarea", required: true, placeholder: "- [ ] Page on-call\n- [ ] Failover replica\n- [ ] Verify writes" },
      ]}
    />
  );
}
