import { DollarSign } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function CostPage() {
  return (
    <ResourcePage
      storageKey="amer.cost"
      title="Cost Tracker"
      subtitle="Manual or API-fed cloud spend by service/month."
      icon={<DollarSign className="h-6 w-6 text-primary" />}
      searchKeys={["provider", "service", "month"]}
      fields={[
        { name: "provider", label: "Provider", type: "select", options: ["AWS", "GCP", "Azure", "DigitalOcean", "Hetzner", "Other"], required: true },
        { name: "service", label: "Service", required: true },
        { name: "month", label: "Month", placeholder: "2026-06" },
        { name: "amount", label: "Amount (USD)", type: "number", required: true },
        { name: "notes", label: "Notes" },
      ]}
    />
  );
}
