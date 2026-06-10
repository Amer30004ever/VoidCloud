"use client";
import { Heart } from "lucide-react";
import { ResourcePage } from "@/components/common/ResourcePage";

export default function UptimePage() {
  return (
    <ResourcePage
      storageKey="amer.uptime"
      title="Uptime Checks"
      subtitle="Synthetic HTTP probes & status."
      icon={<Heart className="h-6 w-6 text-primary" />}
      searchKeys={["name", "url", "status"]}
      fields={[
        { name: "name", label: "Name", required: true },
        { name: "url", label: "URL", type: "url", required: true },
        { name: "interval", label: "Interval", type: "select", options: ["30s", "1m", "5m", "15m"] },
        { name: "status", label: "Status", type: "select", options: ["Up", "Down", "Degraded", "Unknown"] },
      ]}
    />
  );
}
