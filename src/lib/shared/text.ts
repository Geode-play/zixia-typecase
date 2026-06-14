export function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function isTransparentColor(value: string): boolean {
  return value.trim().toLowerCase() === "transparent";
}

export function sanitizeFileSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "-").slice(0, 80);
}
