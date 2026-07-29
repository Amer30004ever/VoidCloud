"use client";

import { Component, ReactNode } from "react";
import { Button } from "@workspace/ui-kit/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("UI error boundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-center">
          <p className="text-sm font-medium text-red-300">Something went wrong</p>
          <p className="mt-1 text-xs text-white/60">{this.state.error?.message}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
