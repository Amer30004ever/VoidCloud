"use client";

import { useEffect } from "react";
import { WIDGET_ERROR_EVENT, type WidgetErrorReport } from "@workspace/ui-kit/widget-boundary";
import { trackEvent } from "@/lib/analytics";
import { auditApiClient } from "@/features/admin/audit";
import { Sentry } from "@/lib/sentry";

type IncomingReport = WidgetErrorReport & { userInitiated?: boolean };

const STORAGE_KEY = "voidcloud_widget_errors";
const MAX = 50;

function persist(report: IncomingReport) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const existing = raw ? (JSON.parse(raw) as IncomingReport[]) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, report].slice(-MAX)));
  } catch {
    /* storage unavailable — telemetry must never break the UI */
  }
}

/** Locally buffered widget crashes (used by support tooling and tests). */
export function getWidgetErrorLog(): IncomingReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as IncomingReport[]) : [];
  } catch {
    return [];
  }
}

/**
 * Listens for widget-level crashes and forwards route, widget name and stack
 * trace to analytics, Sentry and the audit service. Mounted once, app-wide.
 */
export function WidgetTelemetry() {
  useEffect(() => {
    const handler = (event: Event) => {
      const report = (event as CustomEvent<IncomingReport>).detail;
      if (!report) return;

      persist(report);

      trackEvent(report.userInitiated ? "widget_error_reported" : "widget_error", {
        widget: report.widget,
        route: report.route,
        message: report.message.slice(0, 200),
        reference: report.reference,
      });

      try {
        Sentry.captureException(new Error(`[widget:${report.widget}] ${report.message}`), {
          tags: { widget: report.widget, route: report.route, reference: report.reference },
          extra: { stack: report.stack, componentStack: report.componentStack },
        });
      } catch {
        /* Sentry not configured */
      }

      if (report.userInitiated) {
        void auditApiClient
          .create({
            action: "ui.widget_error_reported",
            resource: `widget:${report.widget}`,
            details: {
              route: report.route,
              reference: report.reference,
              message: report.message,
              stack: report.stack?.slice(0, 2000),
              occurredAt: report.timestamp,
            },
          })
          .catch(() => {
            /* backend offline — report stays buffered locally */
          });
      }
    };

    window.addEventListener(WIDGET_ERROR_EVENT, handler);
    return () => window.removeEventListener(WIDGET_ERROR_EVENT, handler);
  }, []);

  return null;
}
