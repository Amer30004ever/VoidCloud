import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Building2, Phone, Globe, Bell, Users, Key, Save, Webhook } from "lucide-react";

export default function BusinessSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [business, setBusiness] = useState({
    name: "My Business", domain: "", phone: "", website: "", description: "",
  });

  const [whatsapp, setWhatsapp] = useState({
    phoneNumber: "+201061365444", webhookUrl: "", verifyToken: "voidcloud_secure_2026",
  });

  const save = () => toast({ title: "Settings saved", description: "Your changes have been saved." });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Business Settings</h2>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="team">Team Access</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Building2 className="h-5 w-5" /><CardTitle>Business Profile</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Business Name", key: "name", placeholder: "Acme Corp" },
                  { label: "Domain / Subdomain", key: "domain", placeholder: "acme.voidcloud.cc.cd" },
                  { label: "Phone Number", key: "phone", placeholder: "+1 555 000 0000" },
                  { label: "Website", key: "website", placeholder: "https://acme.com" },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <Label>{label}</Label>
                    <Input
                      placeholder={placeholder}
                      value={(business as any)[key]}
                      onChange={e => setBusiness(b => ({ ...b, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Business Description</Label>
                <Textarea
                  placeholder="Tell us about your business…"
                  value={business.description}
                  onChange={e => setBusiness(b => ({ ...b, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save Business Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp */}
        <TabsContent value="whatsapp" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Phone className="h-5 w-5" /><CardTitle>WhatsApp Business Integration</CardTitle></div>
              <CardDescription>Configure your WhatsApp Business API connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-emerald-400 font-medium">Connected to WhatsApp Business API</span>
              </div>
              {[
                { label: "WhatsApp Phone Number", key: "phoneNumber", placeholder: "+201061365444" },
                { label: "Webhook URL", key: "webhookUrl", placeholder: "https://api.voidcloud.cc.cd/api/v1/webhooks/whatsapp" },
                { label: "Verify Token", key: "verifyToken", placeholder: "your_verify_token" },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    placeholder={placeholder}
                    value={(whatsapp as any)[key]}
                    onChange={e => setWhatsapp(w => ({ ...w, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline">Test Connection</Button>
                <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save WhatsApp Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Access */}
        <TabsContent value="team" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Users className="h-5 w-5" /><CardTitle>Team Members</CardTitle></div>
                <Button size="sm">Invite Member</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "John Smith", email: "john@acme.com", role: "ADMIN", status: "active" },
                { name: "Sarah Johnson", email: "sarah@acme.com", role: "AGENT", status: "active" },
                { name: "Mike Davis", email: "mike@acme.com", role: "AGENT", status: "pending" },
              ].map(member => (
                <div key={member.email} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                      {member.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{member.role}</Badge>
                    <Badge variant={member.status === "active" ? "default" : "secondary"}>{member.status}</Badge>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300">Remove</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Bell className="h-5 w-5" /><CardTitle>Business Notification Settings</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "New Lead Alerts", desc: "Notify team when a new lead comes in via WhatsApp" },
                { label: "VPS Status Changes", desc: "Alert when VPS instances go down or restart" },
                { label: "Invoice Reminders", desc: "Send billing reminders to business email" },
                { label: "Team Activity", desc: "Notifications about team member logins and actions" },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              ))}
              <Button onClick={save}><Save className="h-4 w-4 mr-2" />Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys */}
        <TabsContent value="api" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Key className="h-5 w-5" /><CardTitle>API Keys</CardTitle></div>
                <Button size="sm">Generate New Key</Button>
              </div>
              <CardDescription>Use API keys to integrate VoidCloud with your own systems</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Production Key", key: "vc_live_••••••••••••4242", created: "2026-01-15", lastUsed: "2 hours ago" },
                { name: "Development Key", key: "vc_test_••••••••••••8888", created: "2026-03-20", lastUsed: "Yesterday" },
              ].map(k => (
                <div key={k.name} className="p-4 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{k.name}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">Copy</Button>
                      <Button size="sm" variant="ghost" className="text-red-400">Revoke</Button>
                    </div>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground">{k.key}</code>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Created: {k.created}</span>
                    <span>Last used: {k.lastUsed}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
