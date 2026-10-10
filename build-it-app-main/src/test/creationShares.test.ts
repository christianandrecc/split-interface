import { describe, expect, it } from "vitest";
import { splitShareState, splitShareUnits } from "@/lib/splitShare";
import { counterShareUnits } from "@/lib/counterOffer";
import { validateSplitPercentages } from "@/lib/splitSheetWorkflow";

describe("exact ownership across creation and counters", () => {
  it.each(["", " ", "-1", "101", "NaN", "Infinity", "33.333", "33.3300000001", "1e2", "0x64"])("rejects %j without rounding or clamping", (value) => {
    expect(splitShareUnits(value)).toBeNull();
    expect(counterShareUnits(value)).toBeNull();
    expect(validateSplitPercentages([value, 100]).valid).toBe(false);
  });
  it.each([[33.33, 33.33, 33.34], [0, 100], [99.99, 0.01]])("accepts exact shares %j", (...shares) => {
    expect(splitShareState(shares)).toMatchObject({ valid: true, total: 100 });
    expect(validateSplitPercentages(shares).valid).toBe(true);
  });
  it.each([[33.333, 33.333, 33.334], [99.99], [100, 0.01], [], [NaN, 100]])("rejects invalid allocation %j", (...shares) => {
    expect(splitShareState(shares).valid).toBe(false);
    expect(validateSplitPercentages(shares).valid).toBe(false);
  });
});
