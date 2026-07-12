import { Temporal } from "@js-temporal/polyfill";

export interface ProcessingTimeWindow {
  todayStartUtc: number;
  tomorrowStartUtc: number;
  weekStartUtc: number;
  previous7StartUtc: number;
  previous30StartUtc: number;
  asOfUtc: number;
}

export function validateTimezone(timezone: string): string {
  const normalized = timezone.trim();
  Temporal.Now.instant().toZonedDateTimeISO(normalized);
  return normalized;
}

export function processingTimeWindow(timezone: string, asOfUtc = Date.now()): ProcessingTimeWindow {
  const instant = Temporal.Instant.fromEpochMilliseconds(asOfUtc);
  const localDate = instant.toZonedDateTimeISO(validateTimezone(timezone)).toPlainDate();
  const today = localDate.toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from("00:00") });
  const tomorrow = localDate.add({ days: 1 }).toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from("00:00") });
  const monday = localDate.subtract({ days: localDate.dayOfWeek - 1 })
    .toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from("00:00") });
  const previous7 = localDate.subtract({ days: 7 })
    .toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from("00:00") });
  const previous30 = localDate.subtract({ days: 30 })
    .toZonedDateTime({ timeZone: timezone, plainTime: Temporal.PlainTime.from("00:00") });
  return {
    todayStartUtc: Number(today.epochMilliseconds),
    tomorrowStartUtc: Number(tomorrow.epochMilliseconds),
    weekStartUtc: Number(monday.epochMilliseconds),
    previous7StartUtc: Number(previous7.epochMilliseconds),
    previous30StartUtc: Number(previous30.epochMilliseconds),
    asOfUtc,
  };
}
