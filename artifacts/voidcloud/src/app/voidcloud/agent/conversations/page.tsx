import { useEffect, useState, useCallback } from "react";

interface Conversation {
  id: string;
  userId: string;
  platform: string;
  contactId: string;
  title?: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

interface Message {
  id: string;
  role: string;
  content: string;
  type: string;
  direction: string;
  createdAt: string;
}

interface QuickReply {
  id: string;
  text: string;
  category: string;
}

const QUICK_REPLIES: QuickReply[] = [
  { id: "1", text: "Thank you for contacting Void Cloud! How can I help you today?", category: "greeting" },
  { id: "2", text: "I'll look into that for you right away.", category: "acknowledgment" },
  { id: "3", text: "Could you please provide more details about your issue?", category: "request_info" },
  { id: "4", text: "Your request has been forwarded to our technical team.", category: "escalation" },
  { id: "5", text: "Is there anything else I can help you with?", category: "closing" },
];

export default function AgentConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"assigned" | "all">("assigned");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [notes, setNotes] = useState<string>("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/agent/conversations?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/v1/crm/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        const conv = conversations.find((c) => c.id === conversationId);
        if (conv) {
          setSelectedConversation({ ...conv, messages: data.messages || [] });
        }
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    fetchConversationMessages(conversation.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const res = await fetch(`/api/v1/crm/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage, type: "TEXT" }),
      });

      if (res.ok) {
        setNewMessage("");
        fetchConversationMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = (text: string) => {
    setNewMessage(text);
  };

  const updateConversationStatus = async (conversationId: string, status: string) => {
    try {
      const res = await fetch(`/api/v1/crm/conversations/${conversationId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchConversations();
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const saveNotes = async () => {
    if (!selectedConversation || !notes.trim()) return;
    try {
      const res = await fetch(`/api/v1/crm/conversations/${selectedConversation.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        alert("Notes saved successfully");
      }
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  };

  if (loading) return <div className="p-6 text-white/50">Loading your conversations...</div>;

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar - Conversation List */}
      <div className="w-96 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold text-white mb-4">My Conversations</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("assigned")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm ${filter === "assigned"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm ${filter === "all"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
            >
              All Open
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => selectConversation(conv)}
              className={`p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 ${selectedConversation?.id === conv.id ? "bg-white/10" : ""
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{conv.contactId}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${conv.status === "OPEN" ? "bg-emerald-500/20 text-emerald-300" :
                    conv.status === "RESOLVED" ? "bg-blue-500/20 text-blue-300" :
                      "bg-yellow-500/20 text-yellow-300"
                  }`}>
                  {conv.status}
                </span>
              </div>
              <p className="text-white/50 text-sm truncate">
                {conv.messages[conv.messages.length - 1]?.content || "No messages yet"}
              </p>
              <p className="text-white/30 text-xs mt-1">
                {new Date(conv.updatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Conversation Details */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{selectedConversation.contactId}</h2>
                <p className="text-white/50 text-sm">{selectedConversation.title}</p>
              </div>
              <select
                value={selectedConversation.status}
                onChange={(e) => updateConversationStatus(selectedConversation.id, e.target.value)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "INBOUND" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${msg.direction === "INBOUND"
                        ? "bg-white/10 text-white"
                        : "bg-cyan-500 text-white"
                      }`}
                  >
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Replies */}
            <div className="p-4 border-t border-white/10">
              <p className="text-white/50 text-sm mb-2">Quick Replies:</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply.id}
                    onClick={() => handleQuickReply(reply.text)}
                    className="rounded-full bg-white/5 px-3 py-1 text-sm text-white/70 hover:bg-white/10"
                  >
                    {reply.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="rounded-lg bg-cyan-500 px-6 py-2 font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </div>
            </div>

            {/* Notes Section */}
            <div className="p-4 border-t border-white/10">
              <h3 className="text-white font-semibold mb-2">Conversation Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this conversation..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white h-24"
              />
              <button
                onClick={saveNotes}
                className="mt-2 rounded-lg bg-fuchsia-500 px-4 py-2 text-sm text-white hover:bg-fuchsia-600"
              >
                Save Notes
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/50">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
