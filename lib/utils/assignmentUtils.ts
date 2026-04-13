/**
 * Shared helpers used across student, lecturer, and admin assignment pages.
 */

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isPastDue(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

export function fileNameFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return "Attached file";
  }
}
