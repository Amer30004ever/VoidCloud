"use client";

import { Component, type ReactNode } from "react";
import { ErrorState } from "./error-state";
import { Button } from "./button";
import { cn } from "./utils";

export interface WidgetBoundaryProps {
  children: ReactNode;
  /** Optional label used in the fallback copy, e.g. "Cost breakdown". */
  title?: string;
  /** Render the fallback inside a card surface (default true). */
  card?: boolean;
  className?: string;
}

interface State {
  error: Error | null;
  /** Bumped on retry so children remount and refetch. */
  key: number;
}

/**
 * Isolates a single dashboard widget: an unexpected API shape or render error
 * inside `children` degrades to a small inline error card with a retry action
 * instead of blanking the whole page through the app-level error boundary.
 */
export class WidgetBoundary extends Component<WidgetBoundaryProps, State> {
  state: State = { error: null, key: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (typeof console !== "undefined") {
      console.error("[WidgetBoundary]", this.props.title ?? "widget", error);
    }
  }

  private retry = () => {
    this.setState((s) => ({ error: null, key: s.key + 1 }));
  };

  render() {
    const { children, title, card = true, className } = this.props;
    if (this.state.error) {
      return (
        <div
          className={cn(
            card &&
              "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
            className
          )}
          data-state="error"
          data-widget={title}
        >
          <ErrorState
            className="py-8"
            title={title ? `${title} couldn't load` : "This section couldn't load"}
            message="We couldn't read the data for this widget. The rest of the page is unaffected."
            action={
              <Button variant="outline" size="sm" onClick={this.retry}>
                Retry
              </Button>
            }
          />
        </div>
      );
    }
    return <div key={this.state.key} className={className}>{children}</div>;
  }
}
