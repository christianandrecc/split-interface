// Presentation-only normalization; stored signing snapshots are never rewritten.
export const recordText = (value: unknown) => String(value ?? "").normalize("NFC").replace(/\p{Cc}/gu, " ").trim();

export function hasRenderableRecordText(value?: string | null) {
  return typeof value === "string" && Boolean(recordText(value).replace(/\p{Default_Ignorable_Code_Point}/gu, "").trim());
}
