type DeploymentEnvironment = {
  SITE_URL?: string;
  VERCEL_URL?: string;
};

/** Deployment-controlled URLs only; never infer canonicals from request headers. */
export function previewOrigin(
  environment: DeploymentEnvironment = {
    SITE_URL: process.env.SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  }
): URL {
  const value = environment.SITE_URL || (environment.VERCEL_URL
    ? `https://${environment.VERCEL_URL}`
    : "http://localhost:3000");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("SITE_URL must be an absolute HTTPS origin.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.username || url.password || url.pathname !== "/" || url.search || url.hash
  ) {
    throw new Error(
      "SITE_URL must be an HTTPS origin without credentials, path, query or fragment."
    );
  }
  return url;
}
