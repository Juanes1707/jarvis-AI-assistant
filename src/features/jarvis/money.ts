export function normalizeCommand(value: string): string {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const small: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintiun: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const hundreds: Record<string, number> = { cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900 };
function underThousand(text: string): number | null {
  if (/^\d{1,3}$/.test(text)) return Number(text);
  const words = text.split(" ");
  let total = 0;
  if (typeof hundreds[words[0]] === "number") {
    const hundred = words.shift()!;
    total = hundreds[hundred];
    if (hundred === "cien" && words.length) return null;
    if (!words.length) return total;
  }
  if (words.length === 1 && typeof small[words[0]] === "number") return total + small[words[0]];
  if (words.length === 3 && small[words[0]] >= 30 && words[1] === "y" && small[words[2]] > 0 && small[words[2]] < 10) return total + small[words[0]] + small[words[2]];
  return null;
}
function underMillion(text: string): number | null {
  const parts = text.split(/\bmil\b/).map(value => value.trim());
  if (parts.length === 1) return underThousand(text);
  if (parts.length !== 2) return null;
  const left = parts[0] ? underThousand(parts[0]) : 1;
  const right = parts[1] ? underThousand(parts[1]) : 0;
  return left !== null && left > 0 && right !== null ? left * 1000 + right : null;
}
function integerWords(text: string): bigint | null {
  const parts = text.split(/\b(?:millon|millones)\b/).map(value => value.trim());
  if (parts.length === 1) {
    const value = underMillion(text);
    return value === null ? null : BigInt(value);
  }
  if (parts.length !== 2 || !parts[0]) return null;
  const left = underMillion(parts[0]), right = parts[1] ? underMillion(parts[1]) : 0;
  return left !== null && left > 0 && right !== null ? BigInt(left) * 1000000n + BigInt(right) : null;
}

/** COP to exact minor units. Ambiguous or incomplete numbers are rejected. */
export function parsePesoAmount(input: string): bigint | null {
  const text = normalizeCommand(input).replace(/^\$\s*/, "").replace(/\s+/g, " ");
  let result: bigint | null = null;
  if (/^\d+(?:,\d{1,2})?$/.test(text) || /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) {
    const [whole, cents = "0"] = text.replace(/\./g, "").split(",");
    result = BigInt(whole) * 100n + BigInt(cents.padEnd(2, "0"));
  } else if (/^\d+\.\d{1,2}$/.test(text)) {
    const [whole, cents] = text.split(".");
    result = BigInt(whole) * 100n + BigInt(cents.padEnd(2, "0"));
  } else {
    const [whole, cents, extra] = text.split(/ con /);
    const value = integerWords(whole);
    const fraction = cents === undefined ? 0 : underThousand(cents.replace(/ centavos?$/, ""));
    if (extra === undefined && value !== null && fraction !== null && fraction >= 0 && fraction < 100) result = value * 100n + BigInt(fraction);
  }
  return result !== null && result > 0n && result <= 9223372036854775807n ? result : null;
}
