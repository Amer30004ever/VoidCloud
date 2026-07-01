"use client";
import { Boxes } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function InventoryPage() {
  return (
    <ResourcePage
      storageKey="amer.inventory"
      title="Asset Inventory"
      subtitle="Servers, domains, SSL certs, licenses."
      icon={<Boxes className="h-6 w-6 text-primary" />}
      searchKeys={["name", "type", "owner"]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "type", label: "Type", type: "select", options: ["Server", "Domain", "SSL Cert", "License", "VM", "Container"] },
        { name: "owner", label: "Owner" },
        { name: "expiresAt", label: "Expires", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}
