import pino from "pino";

export function createLogger(): pino.Logger {
  const level = process.env["LOG_LEVEL"] ?? "info";
  return pino({ level });
}
