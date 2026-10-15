import { z } from "zod";

export const sendTextSchema = z.object({
  to: z.string().min(5).max(20).regex(/^\+?[0-9]+$/, "use somente dígitos com DDI, ex: 5565999990000"),
  body: z.string().min(1).max(4096),
  previewUrl: z.boolean().optional().default(false),
});

export type SendTextInput = z.infer<typeof sendTextSchema>;

export const webhookVerifySchema = z.object({
  "hub.mode": z.string(),
  "hub.verify_token": z.string(),
  "hub.challenge": z.string(),
});
