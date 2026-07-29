"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { CreateUserPayload, PasswordMode, UserRole, settingsApi } from "@/features/admin/settings";

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { temporaryPassword?: string; mustChangePassword: boolean }) => void;
}

const roles: UserRole[] = ["USER", "ADMIN", "AGENT"];
const passwordModes: { id: PasswordMode; label: string; description: string }[] = [
  { id: "manual", label: "Set password manually", description: "You provide the password now." },
  { id: "random", label: "Generate random password", description: "A secure random password is generated and shown once." },
  { id: "force_change", label: "Require change on next login", description: "User must change password after first login." },
];

export function CreateUserDialog({ open, onClose, onCreated }: CreateUserDialogProps) {
  const [form, setForm] = useState<CreateUserPayload>({
    name: "",
    email: "",
    role: "USER",
    passwordMode: "force_change",
    password: "",
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (form.passwordMode === "manual" && (!form.password || form.password.length < 8)) {
      setError("Manual password must be at least 8 characters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await settingsApi.createUser({
        ...form,
        password: form.passwordMode === "manual" ? form.password : undefined,
      });
      onCreated({
        temporaryPassword: result.temporaryPassword,
        mustChangePassword: result.mustChangePassword,
      });
      onClose();
      setForm({ name: "", email: "", role: "USER", passwordMode: "force_change", password: "", isActive: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Add User</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a user with role and password policy.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="Developer Name"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              placeholder="dev@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as UserRole }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Password Policy</label>
            <div className="space-y-2">
              {passwordModes.map((mode) => (
                <label key={mode.id} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 hover:bg-muted/40">
                  <input
                    type="radio"
                    name="passwordMode"
                    checked={form.passwordMode === mode.id}
                    onChange={() => setForm((current) => ({ ...current, passwordMode: mode.id }))}
                  />
                  <span>
                    <span className="block text-sm font-medium text-foreground">{mode.label}</span>
                    <span className="text-xs text-muted-foreground">{mode.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          {form.passwordMode === "manual" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Minimum 8 characters"
              />
            </div>
          )}
          {form.passwordMode === "force_change" && (
            <div>
              <label className="mb-2 block text-sm font-medium">Initial Password (optional)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="Leave blank to auto-generate"
              />
            </div>
          )}

          {error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AddUserButton({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        Add User
      </button>
      <CreateUserDialog
        open={open}
        onClose={() => setOpen(false)}
        onCreated={({ temporaryPassword, mustChangePassword }) => {
          onCreated();
          if (temporaryPassword) {
            setNotice(`User created. Temporary password: ${temporaryPassword}${mustChangePassword ? " (must change on next login)" : ""}`);
          }
        }}
      />
      {notice && (
        <div className="fixed bottom-4 right-4 z-[110] max-w-md rounded-lg border border-border bg-card p-4 text-sm shadow-lg">
          {notice}
          <button type="button" className="ml-3 text-primary" onClick={() => setNotice(null)}>
            Close
          </button>
        </div>
      )}
    </>
  );
}
