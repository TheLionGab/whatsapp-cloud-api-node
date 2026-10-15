import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";
import type { AppConfig } from "../src/config.js";

const baseConfig: AppConfig = {
  port: 3000,
  whatsappToken: "test-token",
  phoneNumberId: "123",
  verifyToken: "segredo",
  graphVersion: "v22.0",
  appSecret: "",
  dryRun: false,
};

function testApp(fetchImpl?: typeof fetch): ReturnType<typeof createApp> {
  return createApp({ config: baseConfig, logger: createLogger(), fetchImpl });
}

describe("health", () => {
  it("responde ok", async () => {
    const res = await request(testApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "whatsapp-business-api" });
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
    const res = await request(testApp()).post("/webhook").send({ object: "whatsapp_business_account" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

describe("messages/text", () => {
  it("rejeita corpo inválido com 400", async () => {
    const res = await request(testApp()).post("/messages/text").send({ to: "abc", body: "" });
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
      .send({ to: "5565999990000", body: "olá" });
    expect(res.status).toBe(200);
    expect(res.body.providerId).toBe("wamid.1");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain("graph.facebook.com/v22.0/123/messages");
  });

  it("modo dry-run responde sem chamar provider", async () => {
    const dryApp = createApp({
      config: { ...baseConfig, dryRun: true },
      logger: createLogger(),
    });
    const res = await request(dryApp).post("/messages/text").send({ to: "5565999990000", body: "oi" });
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
      .send({ to: "5565999990000", body: "olá" });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("provider_error");
  });
});
