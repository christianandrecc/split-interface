import { Check } from "lucide-react";
import { STEPS, type StepId } from "./types";

export default function ProgressTracker({
  current,
  onNavigate,
  canNavigate,
  completed,
}: {
  current: StepId;
  onNavigate: (step: StepId) => void;
  canNavigate: (step: StepId) => boolean;
  completed: (step: StepId) => boolean;
}) {
  return (
    <nav aria-label="Split creation steps" className="grid grid-cols-4 border-b border-border">
      {STEPS.map((step) => (
        <button key={step.id} type="button" aria-label={step.label}
          aria-current={current === step.id ? "step" : undefined}
          disabled={!canNavigate(step.id)} onClick={() => onNavigate(step.id)}
          className={`flex min-h-14 min-w-0 items-center justify-center gap-2 border-b-2 px-1 py-3 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm ${
            current === step.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground disabled:text-muted-foreground/50"
          }`}>
          <span aria-hidden="true" className={`hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs sm:inline-flex ${
            current === step.id ? "bg-primary/15 text-foreground" : completed(step.id) ? "bg-[hsl(var(--split-verified)/0.1)] text-[hsl(var(--split-verified))]" : "bg-muted"
          }`}>
            {completed(step.id) && current !== step.id ? <Check className="h-3.5 w-3.5" /> : step.num}
          </span>
          {step.label}
        </button>
      ))}
    </nav>
  );
}
