import pino from "pino";

/**
 * O pino-http grava a URL e a query inteiras. Em GET /webhook a query traz o
 * hub.verify_token, então o log leva só o caminho, e cookie, query e endereço do
 * cliente ficam de fora junto com os cabeçalhos de credencial.
 */
export const httpSerializers = {
  req: (req: unknown): Record<string, unknown> => {
    const s = pino.stdSerializers.req(req as Parameters<typeof pino.stdSerializers.req>[0]) as unknown as Record<string, unknown>;
    const { query: _q, params: _p, remoteAddress: _a, remotePort: _r, ...resto } = s;
    return { ...resto, url: typeof s["url"] === "string" ? s["url"].split("?")[0] : undefined };
  },
};

export function createLogger(destination?: pino.DestinationStream): pino.Logger {
  const level = process.env["LOG_LEVEL"] ?? "info";
  return pino(
    {
      level,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        'req.headers["x-hub-signature-256"]',
      ],
    },
    destination,
  );
}
