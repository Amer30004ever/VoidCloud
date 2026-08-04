import api from "@/lib/api";

export type TicketStatus = "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketCategory = "GENERAL" | "BILLING" | "VPS" | "ABUSE";

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorRole: string;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assigneeId?: string | null;
  resourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  messages?: SupportTicketMessage[];
  _count?: { messages: number };
}

export interface SupportStats {
  open: number;
  pending: number;
  resolved: number;
  closed: number;
  total: number;
}

const base = "/crm/support/tickets";

export const supportApi = {
  list: (status?: string) =>
    api
      .get<SupportTicket[]>(base, { params: status ? { status } : undefined })
      .then((r) => r.data),
  stats: () => api.get<SupportStats>(`${base}/stats`).then((r) => r.data),
  get: (id: string) => api.get<SupportTicket>(`${base}/${id}`).then((r) => r.data),
  create: (input: {
    subject: string;
    body: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    resourceId?: string;
  }) => api.post<SupportTicket>(base, input).then((r) => r.data),
  reply: (id: string, body: string, internal = false) =>
    api.post<SupportTicketMessage>(`${base}/${id}/replies`, { body, internal }).then((r) => r.data),
  updateStatus: (id: string, status: TicketStatus, assigneeId?: string) =>
    api.patch<SupportTicket>(`${base}/${id}/status`, { status, assigneeId }).then((r) => r.data),
};

export const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  RESOLVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  CLOSED: "border-white/15 bg-white/5 text-white/60",
};

export const PRIORITY_STYLES: Record<TicketPriority, string> = {
  LOW: "text-white/50",
  NORMAL: "text-white/70",
  HIGH: "text-amber-300",
  URGENT: "text-red-300",
};
