import { Server } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function LabEnvironmentsPage() {
  return (
    <ResourcePage
      storageKey="amer.labs"
      title="Lab Environments"
      subtitle="Homelab VMs, containers, and SSH details."
      icon={<Server className="h-6 w-6 text-primary" />}
      searchKeys={["name", "host", "type"]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "type", label: "Type", type: "select", options: ["VM", "Container", "Bare Metal", "k3s Node"] },
        { name: "host", label: "Host / IP", required: true },
        { name: "sshUser", label: "SSH User" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
