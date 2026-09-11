import { describe, expect, it } from "vitest";
import { counterAllocationState, counterShareUnits, equalCounterShares } from "@/lib/counterOffer";
import type { SplitAllocation } from "@/lib/splitSheetNegotiation";

const allocations: SplitAllocation[] = [
  { participantId: "a", name: "One", role: "Writer", percent: 72 },
  { participantId: "b", name: "Two", role: "Producer", percent: 28 },
];

describe("counter offer allocation math", () => {
  it.each(["", " ", "NaN", "Infinity", "-1", "101", "33.333"])("rejects invalid share %j", (value) => {
    expect(counterShareUnits(value)).toBeNull();
    expect(counterAllocationState(allocations, { a: value, b: "28" }).valid).toBe(false);
  });
  it("accepts finite percentages up to two decimal places", () => {
    expect(counterShareUnits("0")).toBe(0);
    expect(counterShareUnits("100")).toBe(10000);
    expect(counterShareUnits("33.33")).toBe(3333);
    expect(counterAllocationState(allocations, { a: "72", b: "28" })).toMatchObject({ total: 100, valid: true, changed: false });
  });
  it("requires exactly 100% without rounding a short total into a valid one", () => {
    expect(counterAllocationState(allocations, { a: "60.99", b: "39" })).toMatchObject({ valid: false, remaining: 0.01 });
    expect(counterAllocationState(allocations, { a: "61", b: "39.01" })).toMatchObject({ valid: false, remaining: -0.01 });
    expect(counterAllocationState(allocations, { a: "60.99", b: "39.01" })).toMatchObject({ valid: true, total: 100 });
  });
  it.each([2, 3, 7, 12, 100])("splits exactly 100% across %i collaborators", (count) => {
    const people = Array.from({ length: count }, (_, index) => ({ ...allocations[0], participantId: String(index) }));
    const shares = equalCounterShares(people);
    expect(counterAllocationState(people, shares)).toMatchObject({ total: 100, valid: true });
    const values = Object.values(shares).map(Number);
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(0.010001);
  });
  it("does not count unknown values or accept missing/duplicate collaborators", () => {
    expect(counterAllocationState(allocations, { a: "50", b: "40", extra: "10" }).valid).toBe(false);
    expect(counterAllocationState(allocations, { a: "100" }).valid).toBe(false);
    expect(counterAllocationState([allocations[0], allocations[0]], { a: "50" }).valid).toBe(false);
    expect(counterAllocationState([], {}).valid).toBe(false);
  });
});
