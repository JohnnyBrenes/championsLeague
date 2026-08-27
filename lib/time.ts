import type { Locale } from "./i18n";

/**
 * Reference zone of the competition. Champions League kickoffs are set in
 * central European time (18:45 and 21:00 local), so this is the zone the
 * "stadium time" toggle shows. It follows European DST on its own, which is
 * why it is an IANA zone and not a fixed offset.
 */
export const STADIUM_TZ = "Europe/Madrid";

const BCP47: Record<Locale, string> = {
  es: "es-ES",
  en: "en-GB",
};

/** The visitor's own timezone, or the stadium zone if the browser won't say. */
export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || STADIUM_TZ;
  } catch {
    return STADIUM_TZ;
  }
}

/** Kickoff time, e.g. "13:00" (24h) in the given timezone. */
export function formatTime(iso: string, locale: Locale, tz: string): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(new Date(iso));
}

/** Long date heading, e.g. "martes, 16 de septiembre" / "Tuesday, 16 September". */
export function formatDateHeading(
  iso: string,
  locale: Locale,
  tz: string,
): string {
  return new Intl.DateTimeFormat(BCP47[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: tz,
  }).format(new Date(iso));
}

/** Calendar date key "YYYY-MM-DD" in the given timezone (for grouping). */
export function dayKey(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: tz,
  }).format(new Date(iso));
}

/** Today's date key in the given timezone (runtime). */
export function todayKey(tz: string): string {
  return dayKey(new Date().toISOString(), tz);
}
