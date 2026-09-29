import { beforeEach, describe, expect, it } from "vitest";
import { authCallbackCleanPath, clearPendingSplitInvitation, pendingSplitInvitation, splitIdFromUrl, withPendingSplitInvitation } from "@/lib/splitInvitationLink";

const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => { window.sessionStorage.clear(); window.history.replaceState(null, "", "/"); });
describe("invitation navigation", () => {
  it("accepts only a single UUID, never an arbitrary redirect", () => {
    expect(splitIdFromUrl(`https://www.mysplit.co/?split=${id}`)).toBe(id);
    for (const query of ["split=https://evil.test", "split=../../admin", `split=${id}&split=${id}`, "next=https://evil.test", "split=hello"]) {
      expect(splitIdFromUrl(`https://www.mysplit.co/?${query}`)).toBeNull();
    }
  });
  it("preserves the invitation but strips credentials and unrelated parameters after Auth", () => {
    window.history.replaceState(null, "", `/?split=${id}&code=private-code&next=https://evil.test#access_token=private`);
    expect(authCallbackCleanPath()).toBe(`/?split=${id}`);
    expect(withPendingSplitInvitation("https://www.mysplit.co/")).toBe(`https://www.mysplit.co/?split=${id}`);
  });
  it("survives an Auth redirect in the same tab and clears after navigation", () => {
    window.history.replaceState(null, "", `/?split=${id}`);
    expect(pendingSplitInvitation()).toBe(id);
    window.history.replaceState(null, "", "/?code=secret");
    expect(authCallbackCleanPath()).toBe(`/?split=${id}`);
    window.history.replaceState(null, "", `/?split=${id}&preview=motion`);
    clearPendingSplitInvitation();
    expect(window.location.search).toBe("?preview=motion");
    expect(pendingSplitInvitation()).toBeNull();
  });
  it("expires old and rejects malformed stored destinations", () => {
    for (const saved of [{ id, at: Date.now()-86400001 }, { id: "https://evil.test", at: Date.now() }, { id, at: Date.now()+60000 }]) {
      window.sessionStorage.setItem("split.pendingInvitation.v1", JSON.stringify(saved));
      expect(pendingSplitInvitation()).toBeNull();
    }
  });
  it("does not substitute an earlier invitation when the current link is malformed", () => {
    window.sessionStorage.setItem("split.pendingInvitation.v1", JSON.stringify({ id, at: Date.now() }));
    window.history.replaceState(null, "", "/?split=invalid");
    expect(pendingSplitInvitation()).toBeNull();
    window.history.replaceState(null, "", "/");
    expect(pendingSplitInvitation()).toBeNull();
  });
});
