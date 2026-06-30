import { Megaphone } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function AnnouncementsPage() {
  return (
    <ResourcePage
      storageKey="amer.announcements"
      title="Announcements"
      subtitle="Internal broadcast board."
      icon={<Megaphone className="h-6 w-6 text-primary" />}
      searchKeys={["title", "body", "audience"]}
      fields={[
        { name: "title", label: "Title", required: true },
        { name: "audience", label: "Audience", type: "select", options: ["All", "Engineering", "Ops", "Leadership"] },
        { name: "priority", label: "Priority", type: "select", options: ["Info", "Important", "Urgent"] },
        { name: "body", label: "Message", type: "textarea", required: true },
      ]}
    />
  );
}
