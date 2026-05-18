import {
  createParser,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

export { parseAsInteger, parseAsString, parseAsStringLiteral };

// Page numbers are 1-indexed in URLs (`?page=1`) and clamped server-side.
export const parseAsPage = parseAsInteger.withDefault(1);

export function parseAsPageSize(defaultSize: number, max = 200) {
  return createParser({
    parse(query) {
      const n = Number.parseInt(query, 10);
      if (!Number.isFinite(n)) return null;
      if (n < 1) return 1;
      if (n > max) return max;
      return n;
    },
    serialize(value: number) {
      return String(value);
    },
  }).withDefault(defaultSize);
}

export function pageToSkip(page: number, pageSize: number): number {
  return Math.max(0, (page - 1) * pageSize);
}

export function pageCount(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
