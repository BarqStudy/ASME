/** Build-time constants; no server URL or private credentials enter the export. */
export const isPages = process.env.NEXT_PUBLIC_SITE_MODE === "pages";
export const siteBase = process.env.NEXT_PUBLIC_SITE_BASE_PATH || "";
export function assetPath(path: string) {
  return path.startsWith("/") && !path.startsWith("//")
    ? `${siteBase}${path}`
    : path;
}
