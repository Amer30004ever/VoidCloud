"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
  tenantId?: string;
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

export default function WhatsAppCRMDashboard() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/crm/conversations?status=${filter}`);
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
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const assignConversation = async (conversationId: string, agentId: string) => {
    try {
      const res = await fetch(`/api/v1/crm/conversations/${conversationId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedTo: agentId }),
      });

      if (res.ok) {
        fetchConversations();
      }
    } catch (error) {
      console.error("Failed to assign conversation:", error);
    }
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

  const filteredConversations = conversations.filter((conv) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.contactId?.toLowerCase().includes(query) ||
        conv.title?.toLowerCase().includes(query) ||
        conv.messages.some((m) => m.content.toLowerCase().includes(query))
      );
    }
    return true;
  });

  if (loading) return <div className="p-6 text-white/50">Loading conversations...</div>;

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar - Conversation List */}
      <div className="w-96 border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-xl font-bold text-white mb-4">WhatsApp CRM</h1>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/30"
          />
          <div className="flex gap-2 mt-3">
            {["all", "open", "resolved", "pending"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as "all" | "open" | "resolved" | "pending")}
                className={`px-3 py-1 rounded-lg text-sm capitalize ${filter === status
                    ? "bg-cyan-500 text-white"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conv) => (
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
              <div className="flex gap-2">
                <select
                  value={selectedConversation.status}
                  onChange={(e) => updateConversationStatus(selectedConversation.id, e.target.value)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                >
                  <option value="OPEN">Open</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="PENDING">Pending</option>
                </select>
                {user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" ? (
                  <select
                    onChange={(e) => assignConversation(selectedConversation.id, e.target.value)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
                  >
                    <option value="">Assign to...</option>
                    <option value="agent1">Agent 1</option>
                    <option value="agent2">Agent 2</option>
                  </select>
                ) : null}
              </div>
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
