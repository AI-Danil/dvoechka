export function safeRandomUUID(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();

  if (cryptoObj?.getRandomValues) {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  const fallback = `${Date.now()}-${Math.random()}-${Math.random()}`;
  return fallback.replace(/[^a-z0-9]/gi, "").slice(0, 32).padEnd(32, "0").replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/,
    "$1-$2-$3-$4-$5",
  );
}