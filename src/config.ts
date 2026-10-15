import { z } from "zod";

const emptyToUndef = (v: unknown): unknown => (v === "" ? undefined : v);

const configSchema = z.object({
  port: z.preprocess(emptyToUndef, z.coerce.number().int().positive().default(3000)),
  whatsappToken: z.string().optional().default(""),
  phoneNumberId: z.string().optional().default(""),
  verifyToken: z.string().min(1, "WHATSAPP_VERIFY_TOKEN é obrigatório"),
  graphVersion: z.preprocess(emptyToUndef, z.string().min(1).default("v22.0")),
  appSecret: z.string().optional().default(""),
  sendApiKey: z.string().optional().default(""),
  dryRun: z.boolean().default(false),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = configSchema.parse({
    port: env["PORT"],
    whatsappToken: env["WHATSAPP_TOKEN"],
    phoneNumberId: env["WHATSAPP_PHONE_NUMBER_ID"],
    verifyToken: env["WHATSAPP_VERIFY_TOKEN"],
    graphVersion: env["WHATSAPP_GRAPH_VERSION"],
    appSecret: env["WHATSAPP_APP_SECRET"],
    sendApiKey: env["SEND_API_KEY"],
    dryRun: env["DRY_RUN"] === "true" || env["DRY_RUN"] === "1",
  });
  // Fora do dry-run o serviço fala com a Meta e expõe um endpoint de envio:
  // sem assinatura do webhook e sem chave de envio ele não sobe.
  if (!config.dryRun && (!config.appSecret || !config.sendApiKey)) {
    throw new Error("WHATSAPP_APP_SECRET e SEND_API_KEY são obrigatórios fora do DRY_RUN");
  }
  return config;
}
