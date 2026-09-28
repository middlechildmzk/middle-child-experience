/**
 * Runtime validation at every external/system boundary of the bridge.
 *
 * Rules:
 * - Validate BEFORE normalizing. Normalizers only ever see parsed values.
 * - Objects are loose (`z.looseObject`): unknown native columns pass through
 *   untouched so `raw` stays lossless, but every field the normalizer reads
 *   is checked.
 * - Native lifecycle statuses are validated as strings, not enums, so an
 *   unmapped value flows to `unknown` via `mapNativeStatus` instead of
 *   failing the read. Enums are enforced only where the contract types a
 *   closed union (e.g. Playlist.submission_status) — drift there is loud.
 * - No silent drops: one invalid row fails the read with the row index and
 *   the issues. Metric integrity beats a partial list that looks complete.
 */

import { z } from 'zod';

export class BridgeValidationError extends Error {
  readonly boundary: string;
  readonly issues: { path: string; message: string }[];
  constructor(boundary: string, issues: { path: string; message: string }[]) {
    const summary = issues
      .slice(0, 5)
      .map((i) => `${i.path || '(root)'}: ${i.message}`)
      .join('; ');
    super(`Bridge validation failed at ${boundary}: ${summary}${issues.length > 5 ? ` (+${issues.length - 5} more)` : ''}`);
    this.name = 'BridgeValidationError';
    this.boundary = boundary;
    this.issues = issues;
  }
}

function toIssues(error: z.ZodError, prefix = ''): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: [prefix, ...issue.path.map(String)].filter(Boolean).join('.'),
    message: issue.message,
  }));
}

/** Parse one value at a named boundary, or throw BridgeValidationError. */
export function parseAt<S extends z.ZodType>(
  boundary: string,
  schema: S,
  value: unknown,
): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw new BridgeValidationError(boundary, toIssues(result.error));
  return result.data;
}

/** Parse every row; any invalid row fails the whole read (no silent drops). */
export function parseRowsAt<S extends z.ZodType>(
  boundary: string,
  schema: S,
  rows: unknown[],
): z.infer<S>[] {
  const out: z.infer<S>[] = [];
  const issues: { path: string; message: string }[] = [];
  rows.forEach((row, index) => {
    const result = schema.safeParse(row);
    if (result.success) out.push(result.data);
    else issues.push(...toIssues(result.error, `[${index}]`));
  });
  if (issues.length > 0) throw new BridgeValidationError(boundary, issues);
  return out;
}

/* Shared primitives ------------------------------------------------- */

/** Parseable timestamp/date string (Postgres timestamptz or date). */
export const zTimestamp = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'not a parseable timestamp' });

export const zId = z.string().min(1);
export const zStringArray = z.array(z.string());
export const zCount = z.number().int().nonnegative();
