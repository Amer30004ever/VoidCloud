import { useGetServiceHealth, useGetPlatformMetrics, useListAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity } from "lucide-react";

export default function AdminMonitoring() {
  const { data: healthData, isLoading: isHealthLoading } = useGetServiceHealth({ query: { refetchInterval: 30000 } });
  const { data: metricsData, isLoading: isMetricsLoading } = useGetPlatformMetrics();
  const { data: alertsData, isLoading: isAlertsLoading } = useListAlerts();

  if (isHealthLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">System Monitoring</h2>
      </div>

      <Tabs defaultValue="health" className="w-full">
        <TabsList>
          <TabsTrigger value="health">Service Health</TabsTrigger>
          <TabsTrigger value="metrics">Platform Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="health" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {healthData?.services?.map((service: any) => (
              <Card key={service.name}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{service.name}</div>
                    <div className="text-sm text-muted-foreground">{service.responseTime}ms</div>
                  </div>
                  <Badge variant={service.status === 'UP' ? 'default' : service.status === 'DEGRADED' ? 'secondary' : 'destructive'}>
                    {service.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="metrics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resource Usage</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Overall CPU
                    </div>
                    <div className="text-3xl font-bold">{metricsData?.cpuUsage || 0}%</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Overall RAM
                    </div>
                    <div className="text-3xl font-bold">{metricsData?.ramUsage || 0}%</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Active Connections
                    </div>
                    <div className="text-3xl font-bold">{metricsData?.activeConnections || 0}</div>
                  </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alertsData?.map((alert: any) => (
                <div key={alert.id} className="flex justify-between items-start border-b border-border pb-4 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium">{alert.title}</div>
                    <div className="text-sm text-muted-foreground">{alert.message}</div>
                  </div>
                  <Badge variant="destructive">{alert.severity}</Badge>
                </div>
              ))}
              {!alertsData?.length && (
                <div className="text-center py-6 text-muted-foreground">No active alerts</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
