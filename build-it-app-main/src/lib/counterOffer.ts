import type { SplitAllocation } from "@/lib/splitSheetNegotiation";

export function counterShareUnits(value: string): number | null {
  if (!value.trim()) return null;
  const percent = Number(value);
  const units = Math.round(percent * 100);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100 || Math.abs(percent * 100 - units) > 0.000001) return null;
  return units;
}

export function counterAllocationState(allocations: SplitAllocation[], values: Record<string, string>) {
  const units = allocations.map((allocation) => counterShareUnits(values[allocation.participantId] ?? ""));
  const invalidIds = allocations.filter((_, index) => units[index] === null).map((allocation) => allocation.participantId);
  const totalUnits = units.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const complete = allocations.length > 0 && invalidIds.length === 0 && new Set(allocations.map((item) => item.participantId)).size === allocations.length;
  return {
    invalidIds,
    total: totalUnits / 100,
    remaining: (10000 - totalUnits) / 100,
    valid: complete && totalUnits === 10000,
    changed: allocations.some((allocation, index) => units[index] !== Math.round(allocation.percent * 100)),
  };
}

export function equalCounterShares(allocations: SplitAllocation[]): Record<string, string> {
  if (!allocations.length) return {};
  const units = Math.floor(10000 / allocations.length);
  const remainder = 10000 % allocations.length;
  return Object.fromEntries(allocations.map((allocation, index) => [allocation.participantId, String((units + (index < remainder ? 1 : 0)) / 100)]));
}
