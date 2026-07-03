import { useListLeads } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgentLeads() {
  const { data: leads, isLoading: isLeadsLoading } = useListLeads();

  if (isLeadsLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Assigned Leads</h2>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'].map(status => (
              <div key={status} className="bg-muted/50 p-4 rounded-xl min-h-[200px]">
                <h3 className="font-semibold mb-4 text-sm">{status}</h3>
                <div className="space-y-3">
                  {leads?.filter((l: any) => l.status === status).map((lead: any) => (
                    <Card key={lead.id} className="p-3 cursor-pointer hover:border-primary transition-colors">
                      <div className="font-medium text-sm">{lead.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{lead.contact?.name}</div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
