'use client';

import { useState } from 'react';

export function WhatsAppButton() {
  const [isOpen, setIsOpen] = useState(false);
  const number = '201061365444';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-110"
        aria-label="Open WhatsApp chat"
      >
        <svg viewBox="0 0 24 24" fill="white" className="h-8 w-8">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.073 3.197l-.509 2.327 2.437-.702c.839.461 1.768.705 2.767.706 3.18 0 5.766-2.586 5.767-5.766.001-3.181-2.586-5.766-5.767-5.766zM12 0c6.627 0 12 5.373 12 12s-5.373 12-12 12c-1.91 0-3.715-.448-5.324-1.245l-5.891 1.703 1.704-5.827c-1.097-1.346-1.733-2.975-1.733-4.703 0-6.627 5.373-12 12-12z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-72 rounded-lg border bg-white shadow-xl">
          <div className="rounded-t-lg bg-[#075E54] p-4 text-white">
            <h4 className="font-semibold">Chat with Void Cloud</h4>
            <p className="text-sm opacity-90">We&apos;re here to help!</p>
          </div>
          <div className="p-2">
            <a
              href={`https://wa.me/${number}?text=Hello%20Void%20Cloud%2C%20I%20want%20to%20subscribe`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded p-3 transition hover:bg-gray-50"
            >
              Subscribe to Void Cloud
            </a>
            <a
              href={`https://wa.me/${number}?text=Hello%20Void%20Cloud%2C%20I%20need%20support`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded p-3 transition hover:bg-gray-50"
            >
              Technical Support
            </a>
            <a
              href={`https://wa.me/${number}?text=Hello%20Void%20Cloud%2C%20I%20have%20a%20billing%20question`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded p-3 transition hover:bg-gray-50"
            >
              Billing Questions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
