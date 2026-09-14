import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportFailure } from "@/lib/monitoring";

type Props = { children: ReactNode; onReload?: () => void };

export default class AppErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    reportFailure("render_failure");
    // Local diagnostic only. Never log profile data, agreement contents, or Auth URLs.
    console.error("SPLIT_RENDER_FAILURE: the interface could not render.");
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
        <section role="alert" className="w-full max-w-md space-y-4">
          <AlertTriangle aria-hidden="true" className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">SPLIT hit a problem</h1>
          <p className="text-sm leading-6 text-muted-foreground">Reload to reopen SPLIT. Any unsaved edits may be lost.</p>
          <Button className="gap-2" onClick={this.props.onReload ?? (() => window.location.reload())}>
            <RotateCw className="h-4 w-4" />Reload SPLIT
          </Button>
        </section>
      </main>
    );
  }
}
