"use client";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/[^\d]/g, "") || "201061365444";
const WHATSAPP_MESSAGE = "Hi Void Cloud team, I have a question.";

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="group fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-black/30 transition hover:scale-110"
      style={{ backgroundColor: "#25D366" }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full opacity-60 animate-ping"
        style={{ backgroundColor: "#25D366" }}
      />
      <svg
        viewBox="0 0 32 32"
        className="relative h-7 w-7 fill-white"
        aria-hidden
      >
        <path d="M19.11 17.21c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.17-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.42.12-.55.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47l-.52-.01c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27 0 1.34.98 2.63 1.11 2.81.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.65.21 1.25.18 1.72.11.52-.08 1.6-.65 1.83-1.28.23-.63.23-1.17.16-1.28-.07-.11-.25-.18-.52-.32zM16.02 5.33C10.13 5.33 5.34 10.12 5.34 16c0 1.88.5 3.71 1.45 5.33L5.33 26.67l5.49-1.44a10.65 10.65 0 0 0 5.2 1.32h.01c5.88 0 10.67-4.79 10.67-10.67S21.91 5.33 16.02 5.33zm0 19.55h-.01a8.85 8.85 0 0 1-4.51-1.24l-.32-.19-3.26.86.87-3.18-.21-.33A8.86 8.86 0 1 1 16.02 24.88z" />
      </svg>
    </a>
  );
}