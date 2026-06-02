export function sanitizeHandle(handle: string): string {
  // Remove @ prefix if present
  let clean = handle.trim().replace(/^@/, "");
  // Only allow alphanumeric and underscore (valid X handle chars)
  clean = clean.replace(/[^a-zA-Z0-9_]/g, "");
  // Max length 15 (X handle limit)
  clean = clean.slice(0, 15);
  return clean.toLowerCase();
}

export function isValidHandle(handle: string): boolean {
  const clean = sanitizeHandle(handle);
  return clean.length >= 1 && clean.length <= 15 && /^[a-zA-Z0-9_]+$/.test(clean);
}
