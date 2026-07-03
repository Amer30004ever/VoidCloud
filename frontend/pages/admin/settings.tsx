import { useState } from "react";
import { useGetMaintenanceMode } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Save, Shield, Globe, Mail, Key } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function AdminSettings() {
  const { data, isLoading, refetch } = useGetMaintenanceMode();
  const { toast } = useToast();
  const token = localStorage.getItem("voidcloud_token");

  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean | null>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [estimatedEnd, setEstimatedEnd] = useState("");
  const [saving, setSaving] = useState(false);

  const currentEnabled = maintenanceEnabled !== null ? maintenanceEnabled : (data?.enabled || false);
  const currentMessage = maintenanceMessage || data?.message || "";

  const saveMaintenance = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${apiBase}/maintenance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          enabled: currentEnabled,
          message: currentMessage,
          estimatedEnd: estimatedEnd || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Settings saved", description: `Maintenance mode ${currentEnabled ? "enabled" : "disabled"}` });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Platform Settings</h2>
      </div>

      <Tabs defaultValue="maintenance">
        <TabsList>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>

        {/* Maintenance Mode */}
        <TabsContent value="maintenance" className="mt-6 space-y-4">
          <Card className={currentEnabled ? "border-red-500/50 bg-red-500/5" : ""}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${currentEnabled ? "text-red-400" : "text-muted-foreground"}`} />
                <CardTitle>Maintenance Mode</CardTitle>
              </div>
              <CardDescription>When enabled, only Super Admins can access the platform. All other users see a maintenance banner.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div>
                  <Label className="text-base font-semibold">Enable Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground mt-0.5">Users will be redirected to the maintenance page.</p>
                </div>
                <Switch
                  checked={currentEnabled}
                  onCheckedChange={v => setMaintenanceEnabled(v)}
                />
              </div>

              <div className="space-y-2">
                <Label>Maintenance Message</Label>
                <Textarea
                  placeholder="Platform is undergoing scheduled maintenance. We'll be back shortly."
                  value={currentMessage}
                  onChange={e => setMaintenanceMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Estimated End Time (optional)</Label>
                <Input
                  type="datetime-local"
                  value={estimatedEnd}
                  onChange={e => setEstimatedEnd(e.target.value)}
                />
              </div>

              <Button onClick={saveMaintenance} disabled={saving} className={currentEnabled ? "bg-red-600 hover:bg-red-700" : ""}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving…" : currentEnabled ? "Enable Maintenance Mode" : "Save Settings"}
              </Button>
            </CardContent>
          </Card>

          {data && (
            <Card>
              <CardContent className="p-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div><span className="font-medium text-foreground">Current Status: </span>
                  <span className={data.enabled ? "text-red-400" : "text-emerald-400"}>{data.enabled ? "MAINTENANCE" : "OPERATIONAL"}</span>
                </div>
                <div><span className="font-medium text-foreground">Last Updated: </span>{new Date(data.updatedAt).toLocaleString()}</div>
                {data.estimatedEnd && <div><span className="font-medium text-foreground">Est. End: </span>{new Date(data.estimatedEnd).toLocaleString()}</div>}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* General */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Globe className="h-5 w-5" /><CardTitle>Platform Configuration</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Platform Name", placeholder: "VoidCloud", id: "platform-name" },
                { label: "Platform URL", placeholder: "https://voidcloud.cc.cd", id: "platform-url" },
                { label: "Support Email", placeholder: "support@voidcloud.cc.cd", id: "support-email" },
                { label: "Grafana URL", placeholder: "https://grafana.voidcloud.cc.cd", id: "grafana-url" },
              ].map(({ label, placeholder, id }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input id={id} placeholder={placeholder} />
                </div>
              ))}
              <Button><Save className="h-4 w-4 mr-2" />Save General Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Shield className="h-5 w-5" /><CardTitle>Security Settings</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Session Timeout (hours)", value: "168", id: "session-timeout" },
                { label: "Max Login Attempts", value: "5", id: "max-login" },
                { label: "Rate Limit (req/min per IP)", value: "100", id: "rate-limit" },
              ].map(({ label, value, id }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input id={id} type="number" defaultValue={value} />
                </div>
              ))}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                <div>
                  <Label className="text-base font-semibold">Enforce 2FA for Super Admins</Label>
                  <p className="text-sm text-muted-foreground">Require TOTP for all super admin logins.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button><Save className="h-4 w-4 mr-2" />Save Security Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Mail className="h-5 w-5" /><CardTitle>SMTP Configuration</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "SMTP Host", value: "smtp.gmail.com", id: "smtp-host" },
                { label: "SMTP Port", value: "587", id: "smtp-port", type: "number" },
                { label: "SMTP User", value: "support.voidcloud@gmail.com", id: "smtp-user" },
                { label: "From Name", value: "VoidCloud", id: "smtp-from" },
              ].map(({ label, value, id, type }) => (
                <div key={id} className="space-y-2">
                  <Label htmlFor={id}>{label}</Label>
                  <Input id={id} type={type || "text"} defaultValue={value} />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="smtp-pass">SMTP Password</Label>
                <Input id="smtp-pass" type="password" defaultValue="••••••••••••••••" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Send Test Email</Button>
                <Button><Save className="h-4 w-4 mr-2" />Save SMTP Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
