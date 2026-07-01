"use client";
import { Users } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function TeamPage() {
  return (
    <ResourcePage
      storageKey="amer.team"
      title="Team Directory"
      subtitle="Members, roles, skills, on-call status."
      icon={<Users className="h-6 w-6 text-primary" />}
      searchKeys={["name", "role", "email", "skills"]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "role", label: "Role" },
        { name: "email", label: "Email", type: "url" },
        { name: "skills", label: "Skills" },
        { name: "status", label: "On-Call", type: "select", options: ["Primary", "Secondary", "Off"] },
      ]}
    />
  );
}
