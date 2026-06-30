import { Globe2 } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function DnsPage() {
  return (
    <ResourcePage
      storageKey="amer.dns"
      title="DNS Records"
      subtitle="Per-domain DNS record management view."
      icon={<Globe2 className="h-6 w-6 text-primary" />}
      searchKeys={["domain", "name", "type", "value"]}
      fields={[
        { name: "domain", label: "Domain", required: true },
        { name: "name", label: "Name", required: true, placeholder: "@ or api" },
        { name: "type", label: "Type", type: "select", options: ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"], required: true },
        { name: "value", label: "Value", required: true },
        { name: "ttl", label: "TTL", placeholder: "300" },
      ]}
    />
  );
}
