import { z } from "zod";

const emptyToUndef = (v: unknown): unknown => (v === "" ? undefined : v);

const configSchema = z.object({
  port: z.preprocess(emptyToUndef, z.coerce.number().int().positive().default(3000)),
  whatsappToken: z.string().optional().default(""),
  phoneNumberId: z.string().optional().default(""),
  verifyToken: z.preprocess(emptyToUndef, z.string().min(1).default("changeme")),
  graphVersion: z.preprocess(emptyToUndef, z.string().min(1).default("v22.0")),
  appSecret: z.string().optional().default(""),
  dryRun: z.boolean().default(false),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return configSchema.parse({
    port: env["PORT"],
    whatsappToken: env["WHATSAPP_TOKEN"],
    phoneNumberId: env["WHATSAPP_PHONE_NUMBER_ID"],
    verifyToken: env["WHATSAPP_VERIFY_TOKEN"],
    graphVersion: env["WHATSAPP_GRAPH_VERSION"],
    appSecret: env["WHATSAPP_APP_SECRET"],
    dryRun: env["DRY_RUN"] === "true" || env["DRY_RUN"] === "1",
  });
}
