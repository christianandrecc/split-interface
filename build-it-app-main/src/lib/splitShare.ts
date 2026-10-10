// Parse ownership as integer hundredths; never round an invalid share into consent.
export function splitShareUnits(value: number | string): number | null {
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) return null;
  const percent = Number(text);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  return Math.round(percent * 100);
}

export function splitShareState(values: Array<number | string>) {
  const units = values.map(splitShareUnits);
  const totalUnits = units.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const complete = units.length > 0 && units.every((value) => value !== null);
  return { total: totalUnits / 100, complete, valid: complete && totalUnits === 10000 };
}
