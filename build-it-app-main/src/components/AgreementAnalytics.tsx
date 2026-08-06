import { BarChart3 } from "lucide-react";

export default function AgreementAnalytics() {
  return (
    <div className="flex h-full items-center justify-center bg-background px-6 text-center">
      <div className="max-w-sm rounded-xl border border-dashed border-border bg-card px-6 py-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart3 className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-base font-bold text-foreground">Analytics are empty</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Real split-sheet performance and collaborator metrics will appear after backend records are connected.
        </p>
      </div>
    </div>
  );
}
