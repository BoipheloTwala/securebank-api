/**
 * Strips sensitive fields from objects before sending to clients or logging.
 */
export function omitSensitive<T extends Record<string, unknown>>(
  obj: T,
  fields: (keyof T)[] = ['passwordHash', 'password', 'tokenHash']
): Omit<T, keyof T> {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

export function sanitiseEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function parsePagination(
  page?: unknown,
  limit?: unknown
): { page: number; limit: number; skip: number } {
  const parsedPage = Math.max(1, parseInt(String(page ?? 1), 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(String(limit ?? 20), 10) || 20));
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}
