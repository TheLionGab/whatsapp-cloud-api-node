import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/** Comparação em tempo constante, mesmo com tamanhos diferentes. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Confere o cabeçalho X-Hub-Signature-256 ("sha256=<hex>") contra o corpo cru. */
export function validSignature(appSecret: string, rawBody: Buffer, header: string | undefined): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return safeEqual(header.slice("sha256=".length), expected);
}

export function bearerToken(header: string | undefined): string {
  return header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
}
