import { useState } from "react";
import { useListConversations } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Radio, Send, Users, CheckCheck, Clock, Plus, Trash2 } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

const TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Message",
    body: "Hello {{name}}! Welcome to VoidCloud. Your account is ready. 🎉",
    variables: ["name"],
  },
  {
    id: "invoice",
    name: "Invoice Due",
    body: "Hi {{name}}, your invoice of ${{amount}} is due on {{date}}. Pay at: {{link}}",
    variables: ["name", "amount", "date", "link"],
  },
  {
    id: "maintenance",
    name: "Maintenance Notice",
    body: "⚠️ Scheduled maintenance on {{date}} from {{start}} to {{end}}. Services may be briefly unavailable.",
    variables: ["date", "start", "end"],
  },
  {
    id: "vps_ready",
    name: "VPS Ready",
    body: "Your VPS {{hostname}} is now live! 🚀 IP: {{ip}} — Use your SSH key to connect.",
    variables: ["hostname", "ip"],
  },
];

const BROADCAST_HISTORY = [
  { id: 1, template: "Welcome Message", sentTo: "All Tenants", count: 142, delivered: 139, failed: 3, sentAt: "2026-06-28T10:00:00Z" },
  { id: 2, template: "Invoice Due", sentTo: "Segment: Pro Plan", count: 45, delivered: 44, failed: 1, sentAt: "2026-06-25T09:00:00Z" },
  { id: 3, template: "Maintenance Notice", sentTo: "All Users", count: 312, delivered: 308, failed: 4, sentAt: "2026-06-20T08:00:00Z" },
];

export default function AdminWhatsApp() {
  const { data: conversations, isLoading: isConvosLoading } = useListConversations();
  const { toast } = useToast();
  const token = localStorage.getItem("voidcloud_token");

  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null);
  const [segment, setSegment] = useState("all");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const handleSendBroadcast = async () => {
    setSending(true);
    await new Promise(r => setTimeout(r, 1500)); // simulate
    toast({ title: "Broadcast Sent", description: `Message sent to ${segment === "all" ? "all tenants" : segment}` });
    setSending(false);
  };

  const messageBody = selectedTemplate
    ? selectedTemplate.body.replace(/\{\{(\w+)\}\}/g, (_, k) => variables[k] || `{{${k}}}`)
    : customMessage;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">WhatsApp CRM</h2>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-muted-foreground">Connected to WhatsApp Business API</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Conversations", value: conversations?.length || 0, icon: MessageSquare },
          { label: "Open", value: (conversations || []).filter((c: any) => c.status === "OPEN").length, icon: Clock },
          { label: "Resolved", value: (conversations || []).filter((c: any) => c.status === "RESOLVED").length, icon: CheckCheck },
          { label: "Broadcasts Sent", value: 3, icon: Radio },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className="h-7 w-7 text-emerald-400" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="conversations" className="w-full">
        <TabsList>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast Center</TabsTrigger>
          <TabsTrigger value="history">Broadcast History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Conversations */}
        <TabsContent value="conversations" className="mt-6">
          <Card>
            <CardHeader><CardTitle>All Conversations</CardTitle></CardHeader>
            <CardContent>
              {isConvosLoading ? <Skeleton className="h-64 w-full" /> : (
                <div className="space-y-2">
                  {(conversations || []).map((convo: any) => (
                    <div key={convo.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-medium">{convo.contactId || "Unknown Contact"}</div>
                          <div className="text-xs text-muted-foreground">
                            {convo.lastMessageAt ? new Date(convo.lastMessageAt).toLocaleString() : "No messages"}
                          </div>
                        </div>
                      </div>
                      <Badge variant={convo.status === "OPEN" ? "default" : "secondary"}>{convo.status}</Badge>
                    </div>
                  ))}
                  {!conversations?.length && (
                    <div className="text-center py-10 text-muted-foreground">
                      <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No conversations yet</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Center */}
        <TabsContent value="broadcast" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Config */}
            <Card>
              <CardHeader>
                <CardTitle>New Broadcast</CardTitle>
                <CardDescription>Send a message to all tenants or a specific segment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select value={segment} onValueChange={setSegment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tenants</SelectItem>
                      <SelectItem value="pro">Pro Plan Tenants</SelectItem>
                      <SelectItem value="enterprise">Enterprise Tenants</SelectItem>
                      <SelectItem value="starter">Starter Plan Tenants</SelectItem>
                      <SelectItem value="pastdue">Past Due Accounts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Select onValueChange={id => {
                    const t = TEMPLATES.find(t => t.id === id) || null;
                    setSelectedTemplate(t);
                    setVariables({});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose a template or write custom…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">✏️ Custom Message</SelectItem>
                      {TEMPLATES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Template variables */}
                {selectedTemplate && selectedTemplate.variables.map(v => (
                  <div key={v} className="space-y-1.5">
                    <Label className="capitalize">{v}</Label>
                    <Input
                      placeholder={`Enter ${v}…`}
                      value={variables[v] || ""}
                      onChange={e => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                    />
                  </div>
                ))}

                {!selectedTemplate && (
                  <div className="space-y-2">
                    <Label>Custom Message</Label>
                    <Textarea
                      placeholder="Type your message here…"
                      value={customMessage}
                      onChange={e => setCustomMessage(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSendBroadcast}
                  disabled={sending || (!messageBody)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending…" : "Send Broadcast"}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Message Preview</CardTitle>
                <CardDescription>How the message will appear</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-[#0b1f0f] rounded-xl p-6 min-h-48 flex items-end">
                  {messageBody ? (
                    <div className="max-w-xs bg-[#25d366]/20 border border-[#25d366]/30 text-[#e2fce6] rounded-2xl rounded-bl-none px-4 py-3 text-sm leading-relaxed">
                      {messageBody}
                      <div className="text-right text-xs text-[#25d366]/60 mt-1">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓
                      </div>
                    </div>
                  ) : (
                    <div className="w-full text-center text-muted-foreground">
                      <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Select a template or write a message to preview</p>
                    </div>
                  )}
                </div>
                {segment && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Will be sent to: <strong className="text-foreground">{segment === "all" ? "All Tenants" : segment}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Broadcast History */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader><CardTitle>Broadcast History</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {BROADCAST_HISTORY.map(b => (
                <div key={b.id} className="p-4 rounded-lg border border-border space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium">{b.template}</p>
                      <p className="text-sm text-muted-foreground">{b.sentTo} · {new Date(b.sentAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="default">Completed</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center">
                      <p className="text-2xl font-bold">{b.count}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-400">{b.delivered}</p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-400">{b.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(b.delivered / b.count) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-6">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />New Template</Button>
            </div>
            {TEMPLATES.map(t => (
              <Card key={t.id}>
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium">{t.name}</p>
                    <p className="text-sm text-muted-foreground mt-1 font-mono bg-muted/30 px-2 py-1 rounded text-xs">{t.body}</p>
                    <div className="flex gap-1 mt-2">
                      {t.variables.map(v => (
                        <Badge key={v} variant="outline" className="text-xs">{"{{" + v + "}}"}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
