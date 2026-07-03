import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield, KeyRound, ArrowLeft, Eye, EyeOff } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

export default function Login() {
  // Pre-fill only in local development — never in staging or production
  const isDev = process.env.NODE_ENV === 'development';
  const [email, setEmail] = useState(isDev ? "admin@voidcloud.com" : "");
  const [password, setPassword] = useState(isDev ? "VoidCloud2026!" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [verifying2FA, setVerifying2FA] = useState(false);

  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (rawData: any) => {
          // Backend returns { requires2FA: true, userId } when TOTP is needed
          if (rawData.requires2FA) {
            setRequires2FA(true);
            setUserId(rawData.userId);
            return;
          }
          // Normalize token field — Express API returns `token`,
          // NestJS auth service returns `access_token`. Support both.
          const data = {
            ...rawData,
            token: rawData.token ?? rawData.access_token ?? null,
          };
          login(data);
          redirectByRole(data.user?.role);
        },
        onError: (err: any) => {
          toast({
            title: "Login failed",
            description: err.message || "Invalid credentials",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      toast({ title: "Invalid code", description: "Enter the 6-digit code from your authenticator app", variant: "destructive" });
      return;
    }
    setVerifying2FA(true);
    try {
      // Re-submit login with the TOTP token included
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, twoFactorToken: totpCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "2FA verification failed");

      // Normalize token field — the Express API server returns `token`,
      // the NestJS auth service returns `access_token`. Support both.
      const normalized = {
        ...data,
        token: data.token ?? data.access_token ?? null,
      };

      login(normalized);
      redirectByRole(normalized.user?.role);
    } catch (err: any) {
      toast({ title: "2FA failed", description: err.message, variant: "destructive" });
      setTotpCode("");
    } finally {
      setVerifying2FA(false);
    }
  };

  const redirectByRole = (role?: string) => {
    if (role === "SUPER_ADMIN") setLocation("/admin/dashboard");
    else if (role === "ADMIN") setLocation("/business/dashboard");
    else if (role === "AGENT") setLocation("/agent/dashboard");
    else setLocation("/dashboard");
  };

  const resetTo2FA = () => {
    setRequires2FA(false);
    setUserId(null);
    setTotpCode("");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-2xl">V</span>
          </div>
        </div>

        {!requires2FA ? (
          /* ── Step 1: Credentials ── */
          <Card className="border-border">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription>Enter your credentials to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <a href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</a>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                  {loginMutation.isPending ? "Signing in…" : "Sign in"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <a href="/register" className="text-primary hover:underline">Sign up</a>
                </p>
              </form>

              {/* Quick-fill demo accounts — development only, never shown in production */}
              {isDev && (
                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center mb-3">Quick login (dev accounts)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Super Admin", email: "admin@voidcloud.com", password: "VoidCloud2026!" },
                      { label: "Business Admin", email: "business@voidcloud.com", password: "Admin2026!" },
                      { label: "Agent", email: "agent@voidcloud.com", password: "Agent2026!" },
                      { label: "User", email: "user@voidcloud.com", password: "User2026!" },
                    ].map(acc => (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                        className="text-xs px-2 py-1.5 rounded border border-border bg-muted/30 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground text-left"
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ── Step 2: 2FA TOTP ── */
          <Card className="border-border">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-2">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">Two-factor authentication</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handle2FAVerify} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp">Authentication Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="pl-9 text-center text-2xl tracking-[0.5em] font-mono"
                      autoFocus
                      autoComplete="one-time-code"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Open your authenticator app (Google Authenticator, Authy, etc.) to find your code.
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifying2FA || totpCode.length !== 6}
                >
                  {verifying2FA ? "Verifying…" : "Verify & Sign in"}
                </Button>
                <button
                  type="button"
                  onClick={resetTo2FA}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
