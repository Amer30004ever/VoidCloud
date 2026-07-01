import { useGetMaintenanceMode } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettings() {
  const { data, isLoading } = useGetMaintenanceMode();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Platform Settings</h2>
        <Button>Save Changes</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
          <CardDescription>Enable maintenance mode to restrict access to the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Enable Maintenance Mode</Label>
              <p className="text-sm text-muted-foreground">Only Super Admins will be able to log in.</p>
            </div>
            <Switch checked={data?.enabled} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
