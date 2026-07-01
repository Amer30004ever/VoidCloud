"use client";
import { AlertTriangle } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function IncidentsPage() {
  return (
    <ResourcePage
      storageKey="amer.incidents"
      title="Incidents"
      subtitle="Track incidents, severity, timeline, and postmortems."
      icon={<AlertTriangle className="h-6 w-6 text-primary" />}
      searchKeys={["title", "service", "status", "severity"]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "service", label: "Affected Service" },
        { name: "severity", label: "Severity", type: "select", options: ["SEV1", "SEV2", "SEV3", "SEV4"], required: true },
        { name: "status", label: "Status", type: "select", options: ["Investigating", "Identified", "Monitoring", "Resolved"], required: true },
        { name: "summary", label: "Summary / Timeline", type: "textarea" },
      ]}
    />
  );
}
