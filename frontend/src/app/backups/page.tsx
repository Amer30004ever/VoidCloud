"use client";
import { Database } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function BackupsPage() {
  return (
    <ResourcePage
      storageKey="amer.backups"
      title="Backups"
      subtitle="Backup status across services."
      icon={<Database className="h-6 w-6 text-primary" />}
      searchKeys={["service", "destination", "status"]}
      fields={[
        { name: "service", label: "Service", required: true },
        { name: "destination", label: "Destination", placeholder: "s3://backups/db" },
        { name: "schedule", label: "Schedule", placeholder: "daily 03:00" },
        { name: "status", label: "Status", type: "select", options: ["OK", "Warning", "Failed"], required: true },
        { name: "lastRun", label: "Last run", type: "date" },
      ]}
    />
  );
}
