/**
 * Extracts the backend error message from an Axios error response.
 * Falls back to `fallback` if the response doesn't contain a message.
 */
export function errMsg(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? fallback
  );
}
