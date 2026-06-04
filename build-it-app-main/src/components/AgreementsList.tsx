import React, { useState } from "react";
import { Agreement, StatusBadge, AgreementIcon } from "@/components/Dashboard";
import { Plus } from "lucide-react";

type FilterStatus = "All" | Agreement["status"];

const STATUS_FILTERS: FilterStatus[] = ["All", "Executed", "Pending Signatures", "Draft", "Amended", "Disputed"];

export default function AgreementsList({
  agreements,
  selected,
  onSelect,
  onNew,
}: {
  agreements: Agreement[];
  selected: Agreement | null;
  onSelect: (a: Agreement) => void;
  onNew: () => void;
}) {
  const [filter, setFilter] = useState<FilterStatus>("All");

  const filtered = filter === "All" ? agreements : agreements.filter((a) => a.status === filter);

  return (
    <div className="w-full md:w-[320px] flex-shrink-0 md:border-r border-border flex flex-col bg-card overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Split Sheets</h2>
          <button
            onClick={onNew}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.slice(0, 4).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="px-4 py-2 flex-shrink-0">
        <span className="text-[11px] text-muted-foreground font-medium">
          {filtered.length} split sheet{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((agr) => {
          const isSelected = selected?.id === agr.id;
          return (
            <button
              key={agr.id}
              onClick={() => onSelect(agr)}
              className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors ${
                isSelected ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <AgreementIcon type={agr.type} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
                    {agr.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <StatusBadge status={agr.status} />
                    <span className="text-[10px] text-muted-foreground">v{agr.version}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {agr.parties.slice(0, 2).join(", ")}
                    {agr.parties.length > 2 && ` +${agr.parties.length - 2}`}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
