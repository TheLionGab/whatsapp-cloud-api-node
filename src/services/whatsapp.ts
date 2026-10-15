import type { AppConfig } from "../config.js";
import type { SendTextInput } from "../schemas.js";

export type FetchLike = typeof fetch;

export interface SendResult {
  providerId: string;
  raw: unknown;
}

function errorMessage(status: number, payload: unknown): string {
  if (payload !== null && typeof payload === "object" && "error" in payload) {
    const err = (payload as { error?: { message?: unknown } }).error;
    if (err !== null && typeof err === "object" && typeof err.message === "string") {
      return err.message;
    }
  }
  return `Graph API respondeu HTTP ${status}`;
}

export async function sendTextMessage(
  config: AppConfig,
  input: SendTextInput,
  fetchImpl: FetchLike = fetch,
): Promise<SendResult> {
  if (config.whatsappToken === "" || config.phoneNumberId === "") {
    throw new Error("WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID são obrigatórios para envio");
  }
  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: { body: input.body, preview_url: input.previewUrl },
    }),
  });
  const payload: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(errorMessage(res.status, payload));
  }
  const id =
    payload !== null &&
    typeof payload === "object" &&
    "messages" in payload &&
    Array.isArray((payload as { messages: unknown }).messages) &&
    (payload as { messages: Array<{ id?: unknown }> }).messages[0]?.id;
  return { providerId: typeof id === "string" ? id : "", raw: payload };
}
