"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  issueSessionToken,
  isPinConfigured,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  setPin,
  verifyPin,
} from "@/lib/auth";

export type AuthState = { error?: string } | null;

const NextInput = z.object({
  next: z.string().startsWith("/").default("/"),
});

const SetupInput = NextInput.extend({
  pin: z.string().min(4, "PIN must be at least 4 characters"),
  confirm: z.string().min(4),
});

const UnlockInput = NextInput.extend({
  pin: z.string().min(4, "PIN must be at least 4 characters"),
});

export async function setupAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (isPinConfigured()) {
    return { error: "PIN already configured. Use unlock." };
  }
  const parsed = SetupInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (parsed.data.pin !== parsed.data.confirm) {
    return { error: "PINs don't match" };
  }
  setPin(parsed.data.pin);
  const token = issueSessionToken();
  const c = await cookies();
  c.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  redirect(parsed.data.next);
}

export async function unlockAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = UnlockInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!verifyPin(parsed.data.pin)) {
    return { error: "Incorrect PIN" };
  }
  const token = issueSessionToken();
  const c = await cookies();
  c.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  redirect(parsed.data.next);
}
