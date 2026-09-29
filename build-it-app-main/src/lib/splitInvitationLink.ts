const KEY = "split.pendingInvitation.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_AGE = 24 * 60 * 60 * 1000;

export function splitIdFromUrl(href: string): string | null {
  try {
    const values = new URL(href).searchParams.getAll("split");
    return values.length === 1 && UUID.test(values[0]) ? values[0].toLowerCase() : null;
  } catch { return null; }
}

export function pendingSplitInvitation(): string | null {
  if (typeof window === "undefined") return null;
  const id = splitIdFromUrl(window.location.href);
  if (id) {
    try { window.sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* URL remains the fallback. */ }
    return id;
  }
  if (new URL(window.location.href).searchParams.has("split")) {
    try { window.sessionStorage.removeItem(KEY); } catch { /* Invalid links must not reuse another invitation. */ }
    return null;
  }
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(KEY) || "null");
    if (saved && typeof saved.id === "string" && UUID.test(saved.id)
      && typeof saved.at === "number" && Date.now() >= saved.at && Date.now() - saved.at < MAX_AGE) return saved.id;
    window.sessionStorage.removeItem(KEY);
  } catch { /* Unavailable storage must not prevent sign-in. */ }
  return null;
}

export function withPendingSplitInvitation(base: string): string {
  const id = pendingSplitInvitation();
  const url = new URL(base);
  if (id) url.searchParams.set("split", id);
  return url.toString();
}

export function authCallbackCleanPath(): string {
  const id = pendingSplitInvitation();
  return `${window.location.pathname || "/"}${id ? `?split=${id}` : ""}`;
}

export function clearPendingSplitInvitation() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* No persisted navigation state. */ }
  const url = new URL(window.location.href);
  url.searchParams.delete("split");
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
