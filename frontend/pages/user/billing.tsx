import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useListInvoices, useListSubscriptions } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Download, CheckCircle2, Clock, AlertTriangle, Zap } from "lucide-react";

const PLANS = [
  { name: "Starter", price: 29, features: ["1 VPS", "1 CPU", "1 GB RAM", "20 GB Storage", "Email Support"], current: true },
  { name: "Pro",     price: 99, features: ["5 VPS", "4 CPU", "8 GB RAM", "100 GB Storage", "Priority Support", "WhatsApp CRM"], current: false },
  { name: "Enterprise", price: 299, features: ["Unlimited VPS", "Custom CPU", "Custom RAM", "Custom Storage", "Dedicated Support", "SLA 99.9%"], current: false },
];

export default function UserBilling() {
  const { data: invoices, isLoading: invLoading } = useListInvoices();
  const { data: subscriptions, isLoading: subLoading } = useListSubscriptions();

  const activeSubscription = (subscriptions || [])[0];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Billing & Subscription</h2>

      {/* Current Plan */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Current Plan: Starter</CardTitle>
              <CardDescription>Billed monthly · Next renewal on August 1, 2026</CardDescription>
            </div>
            <Badge variant="default" className="text-sm px-3 py-1">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 mb-4">
            <span className="text-4xl font-bold">$29</span>
            <span className="text-muted-foreground mb-1">/month</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["1 VPS", "1 CPU", "1 GB RAM", "20 GB Storage"].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">Manage Payment Method</Button>
            <Button size="sm">Upgrade Plan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <Card key={plan.name} className={plan.current ? "border-primary/50 bg-primary/5" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {plan.current && <Badge>Current</Badge>}
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </div>
                ))}
                <Button className="w-full mt-4" variant={plan.current ? "outline" : "default"} disabled={plan.current}>
                  {plan.current ? "Current Plan" : (
                    <><Zap className="h-4 w-4 mr-1.5" />Upgrade to {plan.name}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <Card>
        <CardHeader><CardTitle>Payment Method</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 12/2028</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">Change</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice History</CardTitle>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Download All</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invLoading ? <Skeleton className="h-48 m-4" /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Show sample invoices if none from API */}
                {(invoices?.length ? invoices : [
                  { id: "INV-001", createdAt: "2026-07-01", amount: "29.00", status: "PAID" },
                  { id: "INV-002", createdAt: "2026-06-01", amount: "29.00", status: "PAID" },
                  { id: "INV-003", createdAt: "2026-05-01", amount: "29.00", status: "PAID" },
                ]).map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono font-medium">#{inv.id}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono">${inv.amount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {(inv.status === "paid" || inv.status === "PAID")
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          : (inv.status === "pending" || inv.status === "PENDING")
                          ? <Clock className="h-4 w-4 text-yellow-400" />
                          : <AlertTriangle className="h-4 w-4 text-red-400" />}
                        <Badge variant={(inv.status === "paid" || inv.status === "PAID") ? "default" : (inv.status === "pending" || inv.status === "PENDING") ? "secondary" : "destructive"}>
                          {inv.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
