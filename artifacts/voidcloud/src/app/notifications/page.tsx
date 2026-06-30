
import { Bell } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function NotificationsPage() {
  return (
    <ResourcePage
      storageKey="amer.notifications"
      title="Notification Center"
      subtitle="All alerts, mentions, and system events in one place."
      icon={<Bell className="h-6 w-6 text-primary" />}
      searchKeys={["title", "source", "level"]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "source", label: "Source", placeholder: "monitoring, github, ci" },
        { name: "level", label: "Level", type: "select", options: ["info", "warning", "critical"] },
        { name: "link", label: "Deep link", type: "url" },
      ]}
    />
  );
}
