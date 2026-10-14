export function extractInvoiceUrl(text) {
  const value = String(text ?? "").trim();
  if (!value) return null;

  const candidate = /^https?:\/\//i.test(value) ? value : (value.match(/https?:\/\/\S+/i)?.[0] ?? "");
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function isCameraContextSecure(location = globalThis.location, isSecureContext = globalThis.isSecureContext) {
  if (isSecureContext) return true;
  return ["localhost", "127.0.0.1", "[::1]"].includes(location?.hostname);
}
