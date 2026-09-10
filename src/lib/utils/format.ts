import { APP_CONFIG } from "../../config/app";

export function formatMoney(amountMinor: bigint, currency: string = APP_CONFIG.currency): string {
  const magnitude = amountMinor < 0n ? -amountMinor : amountMinor;
  const whole = magnitude / 100n;
  const cents = magnitude % 100n;
  const digits = cents === 0n ? 0 : 2;
  const formatter = new Intl.NumberFormat(APP_CONFIG.locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits });
  // Hermes on Android rejects BigInt in Intl. Use small numeric templates only;
  // keep the actual amount as decimal text, including values beyond Number's precision.
  const separator = formatter.formatToParts(1000).find(part => part.type === "group")?.value ?? "";
  // The app's es-CO locale groups integer digits in threes.
  const integer = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return formatter.formatToParts(amountMinor < 0n ? -1 : 1)
    .map(part => {
      if (part.type === "integer") return integer;
      if (part.type === "fraction") return cents.toString().padStart(2, "0");
      return part.value;
    }).join("");
}

export function formatGrade(gradeHundredths: number): string {
  return new Intl.NumberFormat(APP_CONFIG.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .format(gradeHundredths / 100);
}

export function formatTime(instant: Date): string {
  return new Intl.DateTimeFormat(APP_CONFIG.locale, { timeZone: APP_CONFIG.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(instant);
}

export function formatDate(instant: Date): string {
  return new Intl.DateTimeFormat(APP_CONFIG.locale, { timeZone: APP_CONFIG.timezone, day: "numeric", month: "short" }).format(instant);
}

export function localDateKey(instant: Date, timezone = APP_CONFIG.timezone): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
