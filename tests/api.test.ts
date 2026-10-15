import { describe, expect, it } from "vitest";
import request from "supertest";
import { createHmac } from "node:crypto";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";
import { loadConfig, type AppConfig } from "../src/config.js";

const baseConfig: AppConfig = {
  port: 3000,
  whatsappToken: "test-token",
  phoneNumberId: "123",
  verifyToken: "segredo",
  graphVersion: "v22.0",
  appSecret: "app-secret",
  sendApiKey: "send-key",
  dryRun: false,
};

const AUTH = { Authorization: "Bearer send-key" };

function sign(body: string, secret = "app-secret"): string {
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

function testApp(fetchImpl?: typeof fetch): ReturnType<typeof createApp> {
  return createApp({ config: baseConfig, logger: createLogger(), fetchImpl });
}

describe("health", () => {
  it("responde ok", async () => {
    const res = await request(testApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "whatsapp-cloud-api-node" });
  });
});

describe("webhook verify", () => {
  it("devolve challenge com token correto", async () => {
    const res = await request(testApp())
      .get("/webhook")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "segredo", "hub.challenge": "abc" });
    expect(res.status).toBe(200);
    expect(res.text).toBe("abc");
  });

  it("nega token errado com 403", async () => {
    const res = await request(testApp())
      .get("/webhook")
      .query({ "hub.mode": "subscribe", "hub.verify_token": "errado", "hub.challenge": "abc" });
    expect(res.status).toBe(403);
  });
});

describe("webhook receive", () => {
  it("confirma recebimento", async () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const res = await request(testApp())
      .post("/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", sign(body))
      .send(body);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  it("rejeita assinatura ausente, errada ou de outro corpo com 401", async () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const send = (sig?: string) => {
      const r = request(testApp()).post("/webhook").set("Content-Type", "application/json");
      return (sig ? r.set("X-Hub-Signature-256", sig) : r).send(body);
    };
    expect((await send()).status).toBe(401);
    expect((await send("sha256=deadbeef")).status).toBe(401);
    expect((await send(sign(body, "outro-segredo"))).status).toBe(401);
    expect((await send(sign('{"object":"x"}'))).status).toBe(401);
  });
});

describe("messages/text", () => {
  it("rejeita corpo inválido com 400", async () => {
    const res = await request(testApp()).post("/messages/text").set(AUTH).send({ to: "abc", body: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("invalid_body");
  });

  it("envia via Graph API com fetch injetado", async () => {
    const calls: Array<{ url: string; init: unknown }> = [];
    const fakeFetch = (async (url: string, init: unknown) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: "wamid.1" }] }),
      };
    }) as unknown as typeof fetch;
    const res = await request(testApp(fakeFetch))
      .post("/messages/text")
      .set(AUTH)
      .send({ to: "5565999990000", body: "olá" });
    expect(res.status).toBe(200);
    expect(res.body.providerId).toBe("wamid.1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("graph.facebook.com/v22.0/123/messages");
  });

  it("exige a chave de envio: 401 sem ela ou com chave errada", async () => {
    const payload = { to: "5565999990000", body: "olá" };
    expect((await request(testApp()).post("/messages/text").send(payload)).status).toBe(401);
    const wrong = await request(testApp())
      .post("/messages/text")
      .set("Authorization", "Bearer outra")
      .send(payload);
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe("unauthorized");
  });

  it("modo dry-run responde sem chamar provider", async () => {
    const dryApp = createApp({
      config: { ...baseConfig, dryRun: true },
      logger: createLogger(),
    });
    const res = await request(dryApp).post("/messages/text").set(AUTH).send({ to: "5565999990000", body: "oi" });
    expect(res.status).toBe(200);
    expect(res.body.providerId).toBe("dry-run-wamid.123");
  });

  it("retorna 502 quando provider falha", async () => {
    const fakeFetch = (async () => ({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: "número inválido" } }),
    })) as unknown as typeof fetch;
    const res = await request(testApp(fakeFetch))
      .post("/messages/text")
      .set(AUTH)
      .send({ to: "5565999990000", body: "olá" });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("provider_error");
  });
});

describe("config", () => {
  it("não sobe sem verify token", () => {
    expect(() => loadConfig({ DRY_RUN: "true" })).toThrow();
  });

  it("fora do dry-run exige app secret e chave de envio", () => {
    expect(() => loadConfig({ WHATSAPP_VERIFY_TOKEN: "v" })).toThrow(/obrigatórios/);
    expect(() =>
      loadConfig({ WHATSAPP_VERIFY_TOKEN: "v", WHATSAPP_APP_SECRET: "s", SEND_API_KEY: "k" }),
    ).not.toThrow();
  });

  it("no dry-run dispensa os dois", () => {
    expect(() => loadConfig({ WHATSAPP_VERIFY_TOKEN: "v", DRY_RUN: "true" })).not.toThrow();
  });
});
