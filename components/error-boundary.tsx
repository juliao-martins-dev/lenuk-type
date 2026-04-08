"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Custom fallback — if omitted the default crash UI is shown. */
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Class-based Error Boundary (required by React — function components cannot
 * use componentDidCatch). Wraps any subtree and catches render/lifecycle errors,
 * showing a friendly recovery UI instead of a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production you'd forward this to Sentry / Datadog here.
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive/70" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-destructive">Something went wrong</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {this.state.error.message || "An unexpected error occurred. Reload the page or try again."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={this.handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
