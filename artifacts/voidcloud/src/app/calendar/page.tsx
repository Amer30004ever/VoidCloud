import { CalendarDays } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function CalendarPage() {
  return (
    <ResourcePage
      storageKey="amer.calendar"
      title="Calendar"
      subtitle="Deployments, maintenance windows, on-call rotations."
      icon={<CalendarDays className="h-6 w-6 text-primary" />}
      searchKeys={["title", "type", "notes"]}
      fields={[
        { name: "title", label: "Event", required: true },
        { name: "type", label: "Type", type: "select", options: ["Deployment", "Maintenance", "On-Call", "Meeting", "Other"], required: true },
        { name: "date", label: "Date", type: "date", required: true },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
