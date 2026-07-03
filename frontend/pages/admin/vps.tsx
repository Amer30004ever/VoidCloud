import { useListVPS } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminVPS() {
  const { data: vpsList, isLoading } = useListVPS();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">VPS Instances</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Instances</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vpsList?.map((vps: any) => (
                <TableRow key={vps.id}>
                  <TableCell className="font-medium">{vps.name}</TableCell>
                  <TableCell>
                    <Badge variant={vps.status === 'RUNNING' ? 'default' : 'secondary'}>
                      {vps.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{vps.ipAddress || 'Pending'}</TableCell>
                </TableRow>
              ))}
              {!vpsList?.length && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                    No VPS instances found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
