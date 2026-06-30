
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { collaborationApi } from "@/lib/collaboration";
import { useChatWebSocket } from "@/hooks/useChatWebSocket";
import { useAuth } from "@/contexts/AuthContext";
import { IconAddButton } from "@/components/ui/create-item-dialog";

export function TeamChatPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: collaborationApi.getChannels,
  });

  const selectedChannelId = activeChannelId ?? channels[0]?.id ?? null;

  const { messages, connected, sendMessage, setInitialMessages } = useChatWebSocket(selectedChannelId);

  useEffect(() => {
    if (!selectedChannelId) return;
    collaborationApi.getMessages(selectedChannelId).then(setInitialMessages);
  }, [selectedChannelId, setInitialMessages]);

  const activeChannel = channels.find((c) => c.id === selectedChannelId);

  const handleSend = () => {
    if (!draft.trim()) return;
    sendMessage(draft.trim(), user?.id);
    setDraft("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Channels</h3>
          <IconAddButton
            title="Create Channel"
            fields={[
              { name: "name", label: "Channel Name", placeholder: "deployments", required: true },
              { name: "description", label: "Description", placeholder: "Release coordination" },
            ]}
            onSubmit={async (values) => {
              await collaborationApi.createChannel({
                name: values.name,
                description: values.description,
              });
              await queryClient.invalidateQueries({ queryKey: ["chat-channels"] });
            }}
          />
        </div>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="space-y-2">
            {channels.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => setActiveChannelId(ch.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  ch.id === selectedChannelId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                # {ch.name}
              </button>
            ))}
            {channels.length === 0 && (
              <p className="text-xs text-muted-foreground">No channels yet. Create one to start chatting.</p>
            )}
          </div>
        )}
      </div>

      <div className="col-span-3 flex flex-col rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            # {activeChannel?.name ?? "general"}
          </h3>
          <span className={`text-xs ${connected ? "text-green-500" : "text-muted-foreground"}`}>
            {connected ? "Live" : "Connecting…"}
          </span>
        </div>

        <div className="mb-4 flex-1 space-y-3 overflow-y-auto max-h-96">
          {messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <span className="font-medium text-foreground">{msg.userName ?? msg.userId ?? "User"}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
              <p className="text-muted-foreground">{msg.content}</p>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">No messages in this channel yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message…"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleSend}
            className="rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
