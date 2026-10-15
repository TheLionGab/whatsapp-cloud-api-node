import express from "express";
import { pinoHttp } from "pino-http";
import type { Logger } from "pino";
import type { AppConfig } from "./config.js";
import { sendTextSchema } from "./schemas.js";
import { type FetchLike, sendTextMessage } from "./services/whatsapp.js";

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  fetchImpl?: FetchLike;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.use(express.json());
  app.use(pinoHttp({ logger: deps.logger }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "whatsapp-business-api" });
  });

  // Verificação do webhook (Meta chama 1x ao cadastrar a URL).
  app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === deps.config.verifyToken && typeof challenge === "string") {
      res.status(200).send(challenge);
      return;
    }
    res.status(403).json({ error: { code: "verify_failed", message: "verify_token inválido" } });
  });

  // Recepção de eventos (mensagens recebidas, status de entrega/leitura).
  app.post("/webhook", (req, res) => {
    const body: unknown = req.body;
    deps.logger.info({ webhook: body }, "webhook recebido");
    res.json({ received: true });
  });

  // Envio de texto via Cloud API.
  app.post("/messages/text", async (req, res) => {
    const parsed = sendTextSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "invalid_body", message: "corpo inválido", details: parsed.error.flatten() },
      });
      return;
    }
    if (deps.config.dryRun) {
      res.status(200).json({
        providerId: "dry-run-wamid.123",
        provider: { dryRun: true, to: parsed.data.to, body: parsed.data.body },
      });
      return;
    }
    try {
      const result = await sendTextMessage(deps.config, parsed.data, deps.fetchImpl);
      res.status(200).json({ providerId: result.providerId, provider: result.raw });
    } catch (err) {
      const message = err instanceof Error ? err.message : "falha no envio";
      const missingCreds = message.includes("obrigatórios");
      res.status(missingCreds ? 500 : 502).json({
        error: { code: missingCreds ? "missing_credentials" : "provider_error", message },
      });
    }
  });

  return app;
}
