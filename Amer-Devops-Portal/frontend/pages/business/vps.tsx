import { useListVPS } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, RotateCw } from "lucide-react";

export default function BusinessVPS() {
  const { data: vpsList, isLoading } = useListVPS();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">VPS Management</h2>
        <Button>Provision New VPS</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vpsList?.map((vps: any) => (
          <Card key={vps.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
              <CardTitle className="font-bold">{vps.name}</CardTitle>
              <Badge variant={vps.status === 'RUNNING' ? 'default' : 'secondary'}>
                {vps.status}
              </Badge>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">IP Address:</span>
                  <div className="font-medium font-mono">{vps.ipAddress || 'Pending'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">OS:</span>
                  <div className="font-medium">{vps.os || 'Ubuntu 22.04'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">CPU:</span>
                  <div className="font-medium">{vps.cpuCores} Cores</div>
                </div>
                <div>
                  <span className="text-muted-foreground">RAM:</span>
                  <div className="font-medium">{vps.ramGb} GB</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button size="icon" variant="outline" title="Start" disabled={vps.status === 'RUNNING'}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" title="Restart" disabled={vps.status !== 'RUNNING'}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" title="Stop" disabled={vps.status !== 'RUNNING'}>
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!vpsList?.length && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
            No VPS instances found.
          </div>
        )}
      </div>
    </div>
  );
}
