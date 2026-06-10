import { z } from "zod";
import type { TelegramUpdate } from "./types";

const TelegramEntitySchema = z.object({
  type: z.string().max(64),
  offset: z.number().int().min(0),
  length: z.number().int().min(0).max(10_000),
  url: z.string().url().max(4096).optional(),
});

const TelegramDocumentSchema = z.object({
  file_id: z.string().min(1).max(4096),
  file_unique_id: z.string().min(1).max(4096),
  file_name: z.string().max(1024).optional(),
  mime_type: z.string().max(255).optional(),
  file_size: z.number().int().min(0).optional(),
});

const TelegramMessageSchema = z.object({
  message_id: z.number().int(),
  from: z
    .object({
      id: z.number().int(),
      is_bot: z.boolean().optional(),
      first_name: z.string().max(256).optional(),
      last_name: z.string().max(256).optional(),
      username: z.string().max(256).optional(),
    })
    .optional(),
  chat: z.object({
    id: z.number().int(),
    type: z.enum(["private", "group", "supergroup", "channel"]),
  }),
  date: z.number().int().optional().default(0),
  text: z.string().max(100_000).optional(),
  caption: z.string().max(10_000).optional(),
  entities: z.array(TelegramEntitySchema).max(100).optional(),
  caption_entities: z.array(TelegramEntitySchema).max(100).optional(),
  document: TelegramDocumentSchema.optional(),
});

const TelegramUpdateSchema = z.object({
  update_id: z.number().int(),
  message: TelegramMessageSchema.optional(),
});

export function parseTelegramUpdate(input: unknown): TelegramUpdate | null {
  const parsed = TelegramUpdateSchema.safeParse(input);
  return parsed.success ? (parsed.data as TelegramUpdate) : null;
}
