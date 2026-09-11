import type { Agreement } from "@/lib/splitSheetAgreement";
import { PENDING_SPLIT_STATUSES, VERIFIED_SPLIT_STATUSES } from "@/lib/splitWorkflow";

export type LibraryFilter = "All" | "Draft" | "Pending" | "Verified" | "Archived";
export type LibrarySort = "recent" | "oldest" | "title";
export type LibraryView = { filter: LibraryFilter; query: string; sort: LibrarySort; page: number };
export type LibraryPosition = { top: number; focusId: string | null };
export const INITIAL_LIBRARY_VIEW: LibraryView = { filter: "All", query: "", sort: "recent", page: 1 };
export const LIBRARY_PAGE_SIZE = 25;

export function matchesLibraryFilter(agreement: Agreement, filter: LibraryFilter) {
  if (filter === "All") return true;
  if (filter === "Pending") return PENDING_SPLIT_STATUSES.includes(agreement.status);
  if (filter === "Verified") return VERIFIED_SPLIT_STATUSES.includes(agreement.status);
  return agreement.status === filter;
}

function searchable(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

export function libraryUpdatedAt(agreement: Agreement) {
  return agreement.document?.updatedAt || agreement.updated;
}

export function filterLibrary(agreements: Agreement[], view: LibraryView) {
  const terms = searchable(view.query).trim().split(/\s+/).filter(Boolean);
  return agreements.filter((agreement) => {
    if (!matchesLibraryFilter(agreement, view.filter)) return false;
    const haystack = searchable([agreement.title, agreement.id, agreement.document?.documentNumber,
      agreement.document?.data.artistProjectName, ...agreement.parties,
      ...(agreement.document?.data.parties.map((party) => party.inviteValue) ?? [])].join(" "));
    return terms.every((term) => haystack.includes(term));
  }).sort((a, b) => {
    const byTitle = a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
    if (view.sort === "title") return byTitle || a.id.localeCompare(b.id);
    const difference = (Date.parse(libraryUpdatedAt(a)) || 0) - (Date.parse(libraryUpdatedAt(b)) || 0);
    return difference * (view.sort === "oldest" ? 1 : -1) || byTitle || a.id.localeCompare(b.id);
  });
}
