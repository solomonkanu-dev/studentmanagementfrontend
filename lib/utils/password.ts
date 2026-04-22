const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";

export function generatePassword(length = 12): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => CHARS[b % CHARS.length])
    .join("");
}
