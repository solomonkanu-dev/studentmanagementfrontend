/**
 * Strip fields that must never be forwarded to the AI model.
 *
 * `keepIds: true` retains `_id` / `id` / `__v` — write-capable agents need
 * record IDs to target a mutation; read-only agents drop them.
 */
const ID_FIELDS = ["_id", "__v", "id"];

const SENSITIVE_FIELDS = [
  "password",
  "token",
  "refreshToken",
  "email",
  "phoneNumber",
  "mobileNumber",
  "address",
  "dateOfBirth",
  "nationalId",
  "guardianPhone",
  "guardianEmail",
];

export function scrubPii(
  value: unknown,
  opts: { keepIds?: boolean } = {}
): unknown {
  const blocked = new Set(
    opts.keepIds ? SENSITIVE_FIELDS : [...SENSITIVE_FIELDS, ...ID_FIELDS]
  );

  function walk(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === "object") {
      const result: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (!blocked.has(k)) result[k] = walk(val);
      }
      return result;
    }
    return v;
  }

  return walk(value);
}
