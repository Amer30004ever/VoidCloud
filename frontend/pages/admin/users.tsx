import { useState } from "react";
import { useListUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Search, UserCheck, UserX, LogIn, Plus, RefreshCw, Shield } from "lucide-react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "/api";

const roleBadge: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  SUPER_ADMIN: "destructive",
  ADMIN: "default",
  AGENT: "secondary",
  USER: "outline",
};

export default function AdminUsers() {
  const { data: users, isLoading, refetch } = useListUsers();
  const { token, login } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [impersonateTarget, setImpersonateTarget] = useState<any>(null);
  const [impersonating, setImpersonating] = useState(false);

  const filtered = (users || []).filter((u: any) => {
    const matchSearch = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || (u.status || "active") === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const handleImpersonate = async () => {
    if (!impersonateTarget) return;
    setImpersonating(true);
    try {
      const res = await fetch(`${apiBase}/users/${impersonateTarget.id}/impersonate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Save current session for return
      if (typeof window !== "undefined") {
        const currentToken = localStorage.getItem("voidcloud_token");
        const currentUser = localStorage.getItem("voidcloud_user");
        localStorage.setItem("voidcloud_prev_token", currentToken || "");
        localStorage.setItem("voidcloud_prev_user", currentUser || "");
      }
      login(data);
      toast({ title: "Impersonating user", description: `You are now logged in as ${impersonateTarget.name}` });
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setImpersonating(false);
      setImpersonateTarget(null);
    }
  };

  const handleToggleStatus = async (u: any) => {
    const newStatus = u.status === "suspended" ? "active" : "suspended";
    try {
      const res = await fetch(`${apiBase}/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: `User ${newStatus}`, description: `${u.name} has been ${newStatus}` });
      refetch();
    } catch {
      toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" /> Add User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: users?.length || 0, color: "text-foreground" },
          { label: "Active", value: (users || []).filter((u: any) => u.status !== "suspended").length, color: "text-emerald-400" },
          { label: "Suspended", value: (users || []).filter((u: any) => u.status === "suspended").length, color: "text-red-400" },
          { label: "Admins", value: (users || []).filter((u: any) => ["SUPER_ADMIN", "ADMIN"].includes(u.role)).length, color: "text-blue-400" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search name or email…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="AGENT">Agent</SelectItem>
            <SelectItem value="USER">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                          {(u.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadge[u.role] || "outline"}>
                        {u.role === "SUPER_ADMIN" && <Shield className="h-3 w-3 mr-1" />}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "suspended" ? "destructive" : u.status === "pending" ? "secondary" : "default"}>
                        {u.status || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.tenantId ? `Tenant #${u.tenantId}` : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.role !== "SUPER_ADMIN" && (
                          <Button
                            size="sm" variant="ghost"
                            onClick={() => setImpersonateTarget(u)}
                            title="Impersonate user"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === "suspended" ? "Activate" : "Suspend"}
                        >
                          {u.status === "suspended"
                            ? <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                            : <UserX className="h-3.5 w-3.5 text-red-400" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Impersonate Confirm Dialog */}
      <Dialog open={!!impersonateTarget} onOpenChange={() => setImpersonateTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Impersonate User</DialogTitle>
            <DialogDescription>
              You are about to log in as <strong>{impersonateTarget?.name}</strong> ({impersonateTarget?.email}).
              This action will be logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImpersonateTarget(null)}>Cancel</Button>
            <Button onClick={handleImpersonate} disabled={impersonating}>
              {impersonating ? "Switching…" : "Login as this user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
