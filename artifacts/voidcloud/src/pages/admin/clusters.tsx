import { useListClusters } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Activity, HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AdminClusters() {
  const { data: clusters, isLoading } = useListClusters();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Clusters</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clusters?.map((cluster: any) => (
          <Card key={cluster.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-bold">{cluster.name}</CardTitle>
              <div className={`h-3 w-3 rounded-full ${cluster.status === 'ACTIVE' ? 'bg-green-500' : 'bg-destructive'}`} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">{cluster.host}</div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><Activity className="h-3 w-3"/> CPU</span>
                  <span>{cluster.cpuUsage || 0}%</span>
                </div>
                <Progress value={cluster.cpuUsage || 0} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><Server className="h-3 w-3"/> RAM</span>
                  <span>{cluster.ramUsage || 0}%</span>
                </div>
                <Progress value={cluster.ramUsage || 0} />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><HardDrive className="h-3 w-3"/> Storage</span>
                  <span>{cluster.diskUsage || 0}%</span>
                </div>
                <Progress value={cluster.diskUsage || 0} />
              </div>
            </CardContent>
          </Card>
        ))}
        {!clusters?.length && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
            No clusters found.
          </div>
        )}
      </div>
    </div>
  );
}
