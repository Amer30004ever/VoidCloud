"use client";

export default function ChatwootWidget() {
  return (
    <button
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg hover:scale-105 transition"
      title="Open chat support"
      onClick={() => alert("Chat support is not configured yet.")}
    >
      <span>💬</span>
      <span>Chat with us</span>
    </button>
  );
}
