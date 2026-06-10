"use client";
import { LifeBuoy } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function DisasterRecoveryPage() {
  return (
    <ResourcePage
      storageKey="amer.dr"
      title="Disaster Recovery"
      subtitle="DR runbooks with RTO / RPO targets."
      icon={<LifeBuoy className="h-6 w-6 text-primary" />}
      searchKeys={["scenario", "service"]}
      fields={[
        { name: "scenario", label: "Scenario", required: true, placeholder: "Region outage" },
        { name: "service", label: "Service" },
        { name: "rto", label: "RTO", placeholder: "1h" },
        { name: "rpo", label: "RPO", placeholder: "15m" },
        { name: "plan", label: "Plan", type: "textarea", required: true },
      ]}
    />
  );
}
