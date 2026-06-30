import { PhoneCall } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function OncallPage() {
  return (
    <ResourcePage
      storageKey="amer.oncall"
      title="On-Call"
      subtitle="Rotation schedule and escalation policy."
      icon={<PhoneCall className="h-6 w-6 text-primary" />}
      searchKeys={["person", "team", "shift"]}
      fields={[
        { name: "team", label: "Team", required: true },
        { name: "person", label: "Person on call", required: true },
        { name: "shift", label: "Shift start", type: "date", required: true },
        { name: "ends", label: "Shift end", type: "date" },
        { name: "escalation", label: "Escalation" },
      ]}
    />
  );
}
