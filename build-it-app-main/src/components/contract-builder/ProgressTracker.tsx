import React from "react";
import { Check } from "lucide-react";
import { STEPS, type StepId } from "./types";

export default function ProgressTracker({
  current,
  onNavigate,
}: {
  current: StepId;
  onNavigate: (step: StepId) => void;
}) {
  const currentIdx = STEPS.findIndex((s) => s.id === current);

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isFuture = i > currentIdx;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => isComplete && onNavigate(step.id)}
              disabled={isFuture}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isCurrent
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isComplete
                  ? "bg-primary/10 text-primary hover:bg-primary/15 cursor-pointer"
                  : "text-muted-foreground/50 cursor-default"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  isCurrent
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : isComplete
                    ? "bg-primary text-primary-foreground"
                    : "bg-border text-muted-foreground/50"
                }`}
              >
                {isComplete ? <Check className="h-3 w-3" /> : step.num}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-4 transition-colors ${
                  i < currentIdx ? "bg-primary/30" : "bg-border"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
