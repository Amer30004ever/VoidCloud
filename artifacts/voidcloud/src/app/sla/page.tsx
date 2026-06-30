import { Gauge } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function SlaPage() {
  return (
    <ResourcePage
      storageKey="amer.sla"
      title="SLA / SLO"
      subtitle="Track service-level objectives and error budgets."
      icon={<Gauge className="h-6 w-6 text-primary" />}
      searchKeys={["service", "objective"]}
      fields={[
        { name: "service", label: "Service", required: true },
        { name: "objective", label: "Objective", placeholder: "99.9% availability", required: true },
        { name: "window", label: "Window", type: "select", options: ["7d", "30d", "90d"] },
        { name: "current", label: "Current %", placeholder: "99.87" },
        { name: "burnRate", label: "Burn rate" },
      ]}
    />
  );
}
