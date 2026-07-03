import { useListPlans } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPlans() {
  const { data: plans, isLoading } = useListPlans();

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Billing Plans</h2>
        <Button>Create Plan</Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {plans?.map((plan: any) => (
          <Card key={plan.id} className="flex flex-col">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col space-y-4">
              <div className="text-center">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              
              <div className="space-y-2 py-4 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {plan.cpu} vCPU
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {plan.ram}GB RAM
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {plan.disk}GB Storage
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" /> {plan.bandwidth}TB Bandwidth
                </div>
              </div>
              
              <Button variant="outline" className="w-full">Edit Plan</Button>
            </CardContent>
          </Card>
        ))}
        {!plans?.length && (
          <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-xl border border-border">
            No plans found.
          </div>
        )}
      </div>
    </div>
  );
}
