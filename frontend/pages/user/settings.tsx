import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Shield, User, Bell, Key, Save, QrCode, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const apiBase = import.meta.env.VITE_API_URL || "/api";

export default function UserSettings() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState({ name: user?.name || "", email: user?.email || "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [twoFaData, setTwoFaData] = useState<{ secret: string; qrCodeUrl: string; recoveryCodes: string[] } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [setting2FA, setSetting2FA] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, whatsapp: true, vpsAlerts: true, billing: true });

  const setup2FA = async () => {
    setSetting2FA(true);
    try {
      const res = await fetch(`${apiBase}/auth/2fa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTwoFaData(data);
    } catch {
      toast({ title: "Error", description: "Failed to setup 2FA", variant: "destructive" });
    } finally {
      setSetting2FA(false);
    }
  };

  const verify2FA = async () => {
    try {
      await fetch(`${apiBase}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: twoFaCode }),
      });
      toast({ title: "2FA Enabled", description: "Two-factor authentication is now active on your account" });
      setTwoFaData(null);
      setTwoFaCode("");
    } catch {
      toast({ title: "Error", description: "Invalid verification code", variant: "destructive" });
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(twoFaData?.secret || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Account Settings</h2>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security & 2FA</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><User className="h-5 w-5" /><CardTitle>Profile Information</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
                  {(user?.name || "U")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Role: {user?.role}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
              </div>
              <Button><Save className="h-4 w-4 mr-2" />Save Profile</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Key className="h-5 w-5" /><CardTitle>Change Password</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={passwords.next} onChange={e => setPasswords(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <Button variant="outline">Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security & 2FA */}
        <TabsContent value="security" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Shield className="h-5 w-5" /><CardTitle>Two-Factor Authentication</CardTitle></div>
              <CardDescription>Add an extra layer of security to your account using an authenticator app (Google Authenticator, Authy, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!twoFaData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div>
                      <p className="font-semibold">TOTP Authentication</p>
                      <p className="text-sm text-muted-foreground">Use an authenticator app to generate one-time codes</p>
                    </div>
                    <Button onClick={setup2FA} disabled={setting2FA}>
                      <QrCode className="h-4 w-4 mr-2" />
                      {setting2FA ? "Setting up…" : "Setup 2FA"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-blue-500/30 bg-blue-500/10">
                    <p className="text-sm text-blue-400 font-medium mb-2">Scan this QR code with your authenticator app</p>
                    {/* QR Code placeholder - in production use a QR library */}
                    <div className="bg-white rounded-lg p-4 w-fit mx-auto mb-4">
                      <div className="h-48 w-48 bg-muted flex items-center justify-center rounded">
                        <div className="text-center text-muted-foreground">
                          <QrCode className="h-16 w-16 mx-auto mb-2 text-black" />
                          <p className="text-xs text-black font-mono break-all px-2">{twoFaData.secret.slice(0, 16)}…</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">Or enter this secret manually:</p>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-xs font-mono break-all">{twoFaData.secret}</code>
                      <Button size="sm" variant="ghost" onClick={copySecret}>
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="000000"
                        maxLength={6}
                        value={twoFaCode}
                        onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                        className="font-mono tracking-widest text-center text-lg"
                      />
                      <Button onClick={verify2FA} disabled={twoFaCode.length !== 6}>Verify & Enable</Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recovery Codes (save these!)</p>
                    <div className="grid grid-cols-2 gap-1.5 p-3 bg-muted/30 rounded-lg border border-border">
                      {twoFaData.recoveryCodes.map((code, i) => (
                        <code key={i} className="text-xs font-mono text-center py-1">{code}</code>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Each code can only be used once. Store them somewhere safe.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Active Sessions</CardTitle></CardHeader>
            <CardContent>
              <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Current Session</p>
                    <p className="text-xs text-muted-foreground">Browser — {new Date().toLocaleDateString()}</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2"><Bell className="h-5 w-5" /><CardTitle>Notification Preferences</CardTitle></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email",     label: "Email Notifications", desc: "Receive important updates via email" },
                { key: "whatsapp",  label: "WhatsApp Notifications", desc: "Get messages on your connected WhatsApp" },
                { key: "vpsAlerts", label: "VPS Status Alerts", desc: "Alerts when your VPS goes down or restarts" },
                { key: "billing",   label: "Billing Reminders", desc: "Invoice and payment due date reminders" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={(notifications as any)[key]}
                    onCheckedChange={v => setNotifications(n => ({ ...n, [key]: v }))}
                  />
                </div>
              ))}
              <Button><Save className="h-4 w-4 mr-2" />Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
