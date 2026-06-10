import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare } from "lucide-react";

export default function InboxPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Inbox"
        description="All incoming WhatsApp conversations"
      />

      <div className="flex h-[calc(100vh-10rem)] overflow-hidden rounded-xl border border-border bg-card">
        {/* Conversation list panel */}
        <div className="w-80 shrink-0 border-r border-border">
          <div className="border-b border-border p-4">
            <input
              id="inbox-search"
              type="search"
              placeholder="Search conversations…"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex border-b border-border">
            {["All", "Unread", "Assigned", "Resolved"].map((f) => (
              <button
                key={f}
                className="flex-1 border-b-2 border-transparent px-2 py-2.5 text-xs font-medium text-muted-foreground transition-colors first:border-primary first:text-primary"
              >
                {f}
              </button>
            ))}
          </div>

          {/* Conversation list placeholder */}
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={<MessageSquare className="h-6 w-6" />}
              title="No conversations yet"
              description="Webhook messages will appear here"
            />
          </div>
        </div>

        {/* Thread panel */}
        <div className="flex flex-1 flex-col">
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="Select a conversation"
              description="Choose a conversation from the list to view messages"
            />
          </div>

          {/* Message composer placeholder */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <input
                id="inbox-composer"
                type="text"
                placeholder="Type a message…"
                disabled
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:opacity-50"
              />
              <button
                id="inbox-send"
                disabled
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* CRM side panel placeholder */}
        <div className="hidden w-72 shrink-0 border-l border-border p-4 xl:block">
          <h3 className="text-sm font-semibold text-foreground">Customer Info</h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Contact details and CRM links will appear here.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
