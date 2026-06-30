
import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";

export interface CreateItemField {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "url" | "number";
  required?: boolean;
}

interface CreateItemDialogProps {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  fields?: CreateItemField[];
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
}

function emptyValues(fields: CreateItemField[]) {
  return Object.fromEntries(fields.map((field) => [field.name, ""]));
}

function CreateItemDialogForm({
  title,
  description,
  submitLabel = "Create",
  fields = [{ name: "name", label: "Name", placeholder: "Enter a name", required: true }],
  onClose,
  onSubmit,
}: Omit<CreateItemDialogProps, "open">) {
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(fields));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    for (const field of fields) {
      if (field.required && !values[field.name]?.trim()) {
        setError(`${field.label} is required.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmit(values);
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="mb-2 block text-sm font-medium text-foreground">
                {field.label}
              </label>
              <input
                id={field.name}
                type={field.type ?? "text"}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          ))}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateItemDialog({ open, ...props }: CreateItemDialogProps) {
  if (!open) return null;
  return <CreateItemDialogForm {...props} />;
}

interface AddItemButtonProps {
  label: string;
  title: string;
  description?: string;
  submitLabel?: string;
  fields?: CreateItemField[];
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  className?: string;
}

export function AddItemButton({
  label,
  title,
  description,
  submitLabel,
  fields,
  onSubmit,
  className = "flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90",
}: AddItemButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Plus className="h-4 w-4" />
        {label}
      </button>
      <CreateItemDialog
        open={open}
        title={title}
        description={description}
        submitLabel={submitLabel}
        fields={fields}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
      />
    </>
  );
}

export function IconAddButton({
  title,
  description,
  submitLabel,
  fields,
  onSubmit,
  className = "rounded-lg bg-primary/10 p-1 text-primary hover:bg-primary/20",
  ariaLabel,
}: Omit<AddItemButtonProps, "label"> & { ariaLabel?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className}
        aria-label={ariaLabel ?? title}
      >
        <Plus className="h-4 w-4" />
      </button>
      <CreateItemDialog
        open={open}
        title={title}
        description={description}
        submitLabel={submitLabel}
        fields={fields}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
      />
    </>
  );
}
