"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorState } from "./error-state";
import { Button } from "./button";
import { cn } from "./utils";

export interface WidgetErrorReport {
  /** Widget label, when provided. */
  widget: string;
  /** Route the widget was rendered on. */
  route: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  /** Short id shown to the user so support can correlate the report. */
  reference: string;
  userAgent?: string;
}

/** Fired on `window` so the app can forward widget errors to telemetry. */
export const WIDGET_ERROR_EVENT = "voidcloud:widget-error";

export interface WidgetBoundaryProps {
  children: ReactNode;
  /** Optional label used in the fallback copy, e.g. "Cost breakdown". */
  title?: string;
  /** Render the fallback inside a card surface (default true). */
  card?: boolean;
  className?: string;
  /** Optional extra sink, called in addition to the global event. */
  onError?: (report: WidgetErrorReport) => void;
}

interface State {
  error: Error | null;
  report: WidgetErrorReport | null;
  reported: boolean;
  /** Bumped on retry so children remount and refetch. */
  key: number;
}

function makeReference(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WB-${rand}`;
}

/**
 * Isolates a single dashboard widget: an unexpected API shape or render error
 * inside `children` degrades to a small inline error card with a retry action
 * instead of blanking the whole page through the app-level error boundary.
 *
 * Every caught error is logged with route, widget name and stack trace, and
 * broadcast on `WIDGET_ERROR_EVENT` so the app can forward it to telemetry.
 */
export class WidgetBoundary extends Component<WidgetBoundaryProps, State> {
  state: State = { error: null, report: null, reported: false, key: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const report: WidgetErrorReport = {
      widget: this.props.title ?? "unnamed widget",
      route: typeof window !== "undefined" ? window.location.pathname + window.location.search : "ssr",
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack ?? undefined,
      timestamp: new Date().toISOString(),
      reference: makeReference(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    this.setState({ report });

    if (typeof console !== "undefined") {
      console.error("[WidgetBoundary]", report.widget, report.route, report.reference, error);
    }
    this.props.onError?.(report);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<WidgetErrorReport>(WIDGET_ERROR_EVENT, { detail: report }));
    }
  }

  private retry = () => {
    this.setState((s) => ({ error: null, report: null, reported: false, key: s.key + 1 }));
  };

  private report = () => {
    const { report } = this.state;
    if (!report) return;
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<WidgetErrorReport & { userInitiated: true }>(WIDGET_ERROR_EVENT, {
          detail: { ...report, userInitiated: true },
        })
      );
      void navigator.clipboard?.writeText(report.reference).catch(() => undefined);
    }
    this.setState({ reported: true });
  };

  render() {
    const { children, title, card = true, className } = this.props;
    const { report, reported } = this.state;

    if (this.state.error) {
      return (
        <div
          className={cn(
            card && "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
            className
          )}
          data-state="error"
          data-widget={title}
          data-error-ref={report?.reference}
        >
          <ErrorState
            className="py-8"
            title={title ? `${title} couldn't load` : "This section couldn't load"}
            message={
              reported
                ? `Thanks — reference ${report?.reference} was sent to our team and copied to your clipboard.`
                : "We couldn't read the data for this widget. The rest of the page is unaffected."
            }
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button variant="outline" size="sm" onClick={this.retry}>
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={this.report} disabled={reported}>
                  {reported ? "Report sent" : "Report this issue"}
                </Button>
                {report && (
                  <span className="text-xs text-white/40">Ref {report.reference}</span>
                )}
              </div>
            }
          />
        </div>
      );
    }
    return <div key={this.state.key} className={className}>{children}</div>;
  }
}
