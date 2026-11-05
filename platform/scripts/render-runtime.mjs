/** Derive the public origin without hard-coding an onrender.com service name. */
export function renderEnvironment(environment) {
  const address = environment.APP_URL || environment.RENDER_EXTERNAL_URL;
  if (!address)
    throw new Error("Set APP_URL or use Render's RENDER_EXTERNAL_URL.");
  let url;
  try {
    url = new URL(address);
  } catch {
    throw new Error("The public application URL is invalid.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Use an HTTPS origin without credentials, a path, query or fragment for APP_URL.",
    );
  }
  if (
    environment.NEXT_PUBLIC_SITE_MODE === "pages" ||
    environment.NEXT_PUBLIC_SITE_BASE_PATH
  ) {
    throw new Error(
      "The full Render application must run at the root without the GitHub Pages build flags.",
    );
  }
  return {
    ...environment,
    APP_URL: url.origin,
    HOSTNAME: "0.0.0.0",
    NODE_ENV: "production",
  };
}
