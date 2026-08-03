"use client";

import api from "@/lib/api";

export type AnalyticsEvent = {
  name: string;
  props?: Record<string, string | number | boolean | null | undefined>;
  ts?: string;
};

const STORAGE_KEY = "voidcloud_analytics_queue";
const MAX_QUEUE = 100;

function readQueue(): AnalyticsEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(events: AnalyticsEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_QUEUE)));
  } catch {
    /* storage full or unavailable — analytics must never break the UI */
  }
}

/** Locally buffered events (used by tests and debugging). */
export function getQueuedEvents(): AnalyticsEvent[] {
  return readQueue();
}

/**
 * Best-effort event tracking. Never throws and never blocks the caller:
 * the event is buffered locally and pushed to the analytics service when reachable.
 */
export function trackEvent(name: string, props?: AnalyticsEvent["props"]): void {
  const event: AnalyticsEvent = { name, props, ts: new Date().toISOString() };

  writeQueue([...readQueue(), event]);

  if (typeof window === "undefined") return;

  const w = window as unknown as { dataLayer?: unknown[] };
  if (Array.isArray(w.dataLayer)) {
    w.dataLayer.push({ event: name, ...(props ?? {}) });
  }

  void api.post("/analytics/events", event).catch(() => {
    /* backend offline — event stays buffered locally */
  });
}

/** Conversion funnel helpers for the pricing section. */
export const pricingAnalytics = {
  viewPricing: () => trackEvent("pricing_viewed"),
  toggleBilling: (period: "monthly" | "yearly") =>
    trackEvent("pricing_billing_toggled", { period }),
  ctaClicked: (opts: {
    plan: string;
    priceUSD: number;
    period: "monthly" | "yearly";
    intent: "trial_start" | "checkout" | "contact_sales";
  }) => trackEvent("pricing_cta_clicked", opts),
};

/** Reliability funnel helpers for the public /status page. */
export const statusAnalytics = {
  retryClicked: (attempt: number) => trackEvent("status_retry_clicked", { attempt }),
  apiOutcome: (opts: {
    outcome: "reachable" | "unreachable";
    trigger: "initial" | "retry";
    attempt: number;
    durationMs: number;
    incidents: boolean;
    services: boolean;
    overall?: string;
  }) => trackEvent("status_api_outcome", opts),
};

