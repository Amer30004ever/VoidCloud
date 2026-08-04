import TicketWorkspace from "@/components/support/TicketWorkspace";

export default function AdminSupportPage() {
  return (
    <TicketWorkspace
      staff
      title="Support queue"
      subtitle="Every customer ticket across all tenants — triage, reply and close."
    />
  );
}
