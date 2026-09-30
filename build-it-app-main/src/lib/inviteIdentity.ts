export function isSupportedInvitation(method: string, value: string) {
  const text = value.trim();
  if (method === "email") return text.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(text);
  return method === "username" && /^@?[a-zA-Z0-9._]{3,24}$/.test(text);
}
