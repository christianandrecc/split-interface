import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { StatusBadge } from "@/components/Dashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Agreement } from "@/lib/splitSheetAgreement";
import {
  filterLibrary, INITIAL_LIBRARY_VIEW, LIBRARY_PAGE_SIZE, libraryUpdatedAt, matchesLibraryFilter,
  type LibraryFilter, type LibraryPosition, type LibrarySort, type LibraryView,
} from "@/lib/splitLibrary";
import { workspaceDate, workspaceInitials } from "@/lib/workspaceOverview";
import {
  AlertCircle, Archive, ArrowUpDown, CheckCircle2, ChevronLeft, ChevronRight,
  Clock3, FileText, Loader2, Music2, PenLine, Plus, Search, X,
} from "lucide-react";
import "./split-library.css";

const FILTERS = [
  { value: "All", label: "All", icon: FileText },
  { value: "Draft", label: "Drafts", icon: PenLine },
  { value: "Pending", label: "In progress", icon: Clock3, className: "library-tab-pending" },
  { value: "Verified", label: "Signed", icon: CheckCircle2, className: "library-tab-signed" },
  { value: "Archived", label: "Archived", icon: Archive },
] as const;
const SORTS: { value: LibrarySort; label: string }[] = [
  { value: "recent", label: "Recently updated" },
  { value: "oldest", label: "Oldest updated" },
  { value: "title", label: "Title A-Z" },
];

export default function AgreementsList({
  agreements, view, onViewChange, scrollPosition, onSelect, onNew, loading, loadError, onRetry,
}: {
  agreements: Agreement[];
  view: LibraryView;
  onViewChange: (view: LibraryView) => void;
  scrollPosition: MutableRefObject<LibraryPosition>;
  onSelect: (agreement: Agreement) => void;
  onNew: () => void;
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
}) {
  const scrollRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const filtered = useMemo(() => filterLibrary(agreements, view), [agreements, view]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / LIBRARY_PAGE_SIZE));
  const page = Math.max(1, Math.min(view.page, pageCount));
  const start = (page - 1) * LIBRARY_PAGE_SIZE;
  const visible = filtered.slice(start, start + LIBRARY_PAGE_SIZE);

  const changeView = (next: Partial<LibraryView>) => {
    scrollPosition.current = { top: 0, focusId: null };
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    onViewChange({ ...view, page: 1, ...next });
  };

  useEffect(() => {
    if (!loading && page !== view.page) {
      scrollPosition.current = { top: 0, focusId: null };
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      onViewChange({ ...view, page });
    }
  }, [loading, onViewChange, page, scrollPosition, view]);

  // The library unmounts while a preview or editor is open.
  useLayoutEffect(() => {
    if (loading || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollPosition.current.top;
    const focusId = scrollPosition.current.focusId;
    if (focusId) {
      const row = Array.from(scrollRef.current.querySelectorAll<HTMLElement>("[data-agreement-id]"))
        .find((element) => element.dataset.agreementId === focusId);
      (row?.querySelector<HTMLButtonElement>(".library-open") ?? headingRef.current)?.focus({ preventScroll: true });
      scrollPosition.current.focusId = null;
    }
  }, [loading, scrollPosition]);

  const open = (agreement: Agreement) => {
    scrollPosition.current = { top: scrollRef.current?.scrollTop ?? 0, focusId: agreement.id };
    onSelect(agreement);
  };

  return (
    <section ref={scrollRef} className="split-library" aria-label="Split sheet library"
      onScroll={(event) => { scrollPosition.current.top = event.currentTarget.scrollTop; }}>
      <div className="split-library-inner">
        <header className="library-header">
          <h1 ref={headingRef} tabIndex={-1}>Split Sheets</h1>
          <div className="library-tools">
            <div className="library-search">
              <Search size={17} aria-hidden="true" />
              <input aria-label="Search your split sheets" placeholder="Search splits" value={view.query}
                onChange={(event) => changeView({ query: event.target.value })}
                onKeyDown={(event) => { if (event.key === "Escape") changeView({ query: "" }); }} />
              {view.query && <button type="button" className="library-clear" aria-label="Clear search"
                onClick={() => changeView({ query: "" })}><X size={15} aria-hidden="true" /></button>}
            </div>
            <TooltipProvider delayDuration={300}>
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Sort split sheets">
                        <ArrowUpDown size={18} aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Sort: {SORTS.find((sort) => sort.value === view.sort)?.label}</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={view.sort} onValueChange={(sort) => changeView({ sort: sort as LibrarySort })}>
                    {SORTS.map((sort) => <DropdownMenuRadioItem key={sort.value} value={sort.value}>{sort.label}</DropdownMenuRadioItem>)}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipProvider>
          </div>
        </header>
        <Tabs value={view.filter} onValueChange={(filter) => changeView({ filter: filter as LibraryFilter })}>
          <TabsList className="library-tabs" aria-label="Split sheet status">
            {FILTERS.map(({ value, label, icon: Icon, ...rest }) => (
              <TabsTrigger key={value} value={value} aria-label={label}
                className={`library-tab ${"className" in rest ? rest.className : ""}`}>
                <span className="library-tab-icon"><Icon size={17} aria-hidden="true" />
                  <span className="library-tab-count" aria-hidden="true">
                    {loading ? "..." : agreements.filter((agreement) => matchesLibraryFilter(agreement, value)).length}
                  </span>
                </span>
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={view.filter} className="library-panel" aria-busy={loading}>
            {loadError && !loading && (
              <div className="library-error" role="alert">
                <div><AlertCircle size={18} aria-hidden="true" /><span>Could not refresh your split sheets.</span></div>
                <Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>
              </div>
            )}
            {loading ? (
              <div className="library-empty" role="status"><Loader2 className="animate-spin" size={24} aria-hidden="true" /><p>Loading split sheets...</p></div>
            ) : visible.length ? (
              <>
                <table className="library-table" aria-label="Split sheets">
                  <colgroup><col /><col className="library-col-people" /><col className="library-col-status" />
                    <col className="library-col-updated" /><col className="library-col-open" /></colgroup>
                  <thead><tr><th scope="col">Work</th><th scope="col">Collaborators</th><th scope="col">Status</th>
                    <th scope="col">Updated</th><th scope="col"><span className="sr-only">Open preview</span></th></tr></thead>
                  <tbody>
                    {visible.map((agreement) => (
                      <tr className="library-record" key={agreement.id} data-agreement-id={agreement.id} onClick={() => open(agreement)}>
                        <td className="library-work-cell">
                          <div className="library-work">
                            <span className="library-work-icon"><Music2 size={19} aria-hidden="true" /></span>
                            <div className="library-work-info">
                              <button type="button" className="library-open" aria-label={`Open ${agreement.title} preview`}>{agreement.title}</button>
                              <div className="library-work-meta"><span>{agreement.document?.data.artistProjectName || agreement.type}</span>
                                <span className="library-version">v{agreement.version}</span></div>
                            </div>
                          </div>
                        </td>
                        <td className="library-people-cell">
                          <div className="library-people">
                            <div className="library-avatars" aria-hidden="true">
                              {agreement.parties.slice(0, 2).map((name, index) => <span key={index}>{workspaceInitials(name)}</span>)}
                            </div>
                            <div className="library-party-names" title={agreement.parties.join(", ")}>
                              {agreement.parties.slice(0, 2).map((name, index) => <span key={index}>{name}</span>)}
                              {agreement.parties.length > 2 && <span>+{agreement.parties.length - 2} more</span>}
                            </div>
                          </div>
                        </td>
                        <td className="library-status"><StatusBadge status={agreement.status} inviteDeclined={agreement.status === "Disputed" && agreement.document?.collaboratorInvites.some((invite) => invite.status === "Declined")} /></td>
                        <td className="library-updated"><time dateTime={libraryUpdatedAt(agreement)}>{workspaceDate(libraryUpdatedAt(agreement))}</time></td>
                        <td className="library-chevron"><ChevronRight size={17} aria-hidden="true" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <footer className="library-pagination">
                  <span role="status">{start + 1}-{Math.min(start + LIBRARY_PAGE_SIZE, filtered.length)} of {filtered.length} split sheets</span>
                  {pageCount > 1 && <div>
                    <Button variant="outline" size="icon" aria-label="Previous page" disabled={page === 1} onClick={() => changeView({ page: page - 1 })}><ChevronLeft size={16} /></Button>
                    <span>Page {page} of {pageCount}</span>
                    <Button variant="outline" size="icon" aria-label="Next page" disabled={page === pageCount} onClick={() => changeView({ page: page + 1 })}><ChevronRight size={16} /></Button>
                  </div>}
                </footer>
              </>
            ) : (
              <div className="library-empty">
                <FileText size={28} aria-hidden="true" />
                <h2>{loadError && !agreements.length ? "Split sheets unavailable" : agreements.length ? "No matching split sheets" : "No split sheets yet"}</h2>
                {!loadError && (agreements.length
                  ? <Button variant="outline" onClick={() => changeView(INITIAL_LIBRARY_VIEW)}>Clear filters</Button>
                  : <Button onClick={onNew}><Plus size={16} />New SPLIT</Button>)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
