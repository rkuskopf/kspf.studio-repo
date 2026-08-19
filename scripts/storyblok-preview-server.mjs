import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const STORY_ROUTES = new Map([
  ["/", "index.html"],
  ["/home", "index.html"],
  ["/site", "index.html"],
  ["/experience", "experience.html"],
  ["/case-studies/case-study-aesop", "case-study-aesop.html"],
]);

export const resolvePreviewDocument = (pathname) => {
  if (STORY_ROUTES.has(pathname)) return STORY_ROUTES.get(pathname);
  if (/^\/projects\/[^/]+\/?$/.test(pathname)) return "index.html";
  return null;
};

const ROOT_ASSET_PATTERN = /^\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(?:html|css|js|png|jpg|jpeg|gif|svg|webp|avif|ico|woff2?|ttf|otf)$/i;

export const resolveStaticFile = (repoRoot, pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const segments = decoded.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment.startsWith("."))) return null;

  const isRootAsset = ROOT_ASSET_PATTERN.test(decoded);
  const isUploadedAsset = decoded.startsWith("/assets/") && segments.length > 1;
  const isPreviewClient = decoded === "/scripts/storyblok-preview-client.js";
  if (!isRootAsset && !isUploadedAsset && !isPreviewClient) return null;

  const root = resolve(repoRoot);
  const candidate = resolve(root, `.${decoded}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  return candidate;
};

const PREVIEW_MARKER = "data-kspf-storyblok-preview";

export const injectStoryblokPreview = (html) => {
  if (html.includes(PREVIEW_MARKER)) return html;

  const withBase = /<base\s/i.test(html)
    ? html
    : html.replace(/<head([^>]*)>/i, '<head$1>\n  <base href="/">');
  const scripts = [
    `<script ${PREVIEW_MARKER} src="https://app.storyblok.com/f/storyblok-v2-latest.js"></script>`,
    '<script src="/scripts/storyblok-preview-client.js"></script>',
  ].join("\n  ");

  return withBase.replace(/<\/body>/i, `  ${scripts}\n</body>`);
};

export class DraftContentStore {
  constructor({ loadSnapshot, maxAgeMs = 1000, now = Date.now }) {
    if (typeof loadSnapshot !== "function") {
      throw new Error("DraftContentStore requires a loadSnapshot function.");
    }
    this.loadSnapshot = loadSnapshot;
    this.maxAgeMs = maxAgeMs;
    this.now = now;
    this.snapshot = null;
    this.loadedAt = 0;
    this.inFlight = null;
  }

  get current() {
    return this.snapshot;
  }

  async refresh() {
    if (this.inFlight) return this.inFlight;
    this.inFlight = Promise.resolve()
      .then(() => this.loadSnapshot())
      .then((snapshot) => {
        if (!(snapshot instanceof Map)) {
          throw new Error("Storyblok draft loader must return a Map of generated files.");
        }
        this.snapshot = snapshot;
        this.loadedAt = this.now();
        return snapshot;
      })
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }

  async getSnapshot({ force = false } = {}) {
    const isFresh =
      this.snapshot && !force && this.now() - this.loadedAt <= this.maxAgeMs;
    if (isFresh) return this.snapshot;
    try {
      return await this.refresh();
    } catch (error) {
      if (this.snapshot) return this.snapshot;
      throw error;
    }
  }
}

const send = (response, status, body, headers = {}) => {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(body);
};

const dynamicContentPath = (pathname) => {
  if (pathname === "/projects.json") return "projects.json";
  if (/^\/content\/(?:[^/.]+|case-studies\/[^/.]+)\.json$/.test(pathname)) {
    return pathname.slice(1);
  }
  return null;
};

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

export const createPreviewRequestHandler = ({ repoRoot, store }) => {
  if (!repoRoot || !store) throw new Error("Preview handler requires repoRoot and store.");

  return async (request, response) => {
    const url = new URL(request.url || "/", "https://localhost");
    if (request.method === "POST" && url.pathname === "/__storyblok/refresh") {
      try {
        await store.refresh();
        send(response, 204, "");
      } catch {
        send(response, 502, "Storyblok draft refresh failed.\n", {
          "Content-Type": "text/plain; charset=utf-8",
        });
      }
      return;
    }

    const contentPath = dynamicContentPath(url.pathname);
    if (request.method === "GET" && contentPath) {
      try {
        const snapshot = await store.getSnapshot();
        const content = snapshot.get(contentPath);
        if (content === undefined) {
          send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
          return;
        }
        send(response, 200, `${JSON.stringify(content, null, 2)}\n`, {
          "Content-Type": "application/json; charset=utf-8",
        });
      } catch (error) {
        send(response, 502, "Storyblok draft content is unavailable.\n", {
          "Content-Type": "text/plain; charset=utf-8",
        });
      }
      return;
    }

    const previewDocument = request.method === "GET"
      ? resolvePreviewDocument(url.pathname)
      : null;
    if (previewDocument) {
      try {
        const html = await readFile(resolve(repoRoot, previewDocument), "utf8");
        send(response, 200, injectStoryblokPreview(html), {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy": "frame-ancestors https://app.storyblok.com",
          "X-Content-Type-Options": "nosniff",
        });
      } catch {
        send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
      }
      return;
    }

    const staticFile = request.method === "GET"
      ? resolveStaticFile(repoRoot, url.pathname)
      : null;
    if (staticFile) {
      try {
        const extension = extname(staticFile).toLowerCase();
        const file = await readFile(staticFile);
        const range = request.headers.range;
        const match = typeof range === "string" && /^bytes=(\d+)-(\d*)$/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const requestedEnd = match[2] ? Number(match[2]) : file.length - 1;
          const end = Math.min(requestedEnd, file.length - 1);
          if (start >= file.length || end < start) {
            send(response, 416, "", { "Content-Range": `bytes */${file.length}` });
            return;
          }
          const chunk = file.subarray(start, end + 1);
          send(response, 206, chunk, {
            "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes ${start}-${end}/${file.length}`,
            "Content-Length": String(chunk.length),
            "X-Content-Type-Options": "nosniff",
          });
          return;
        }
        const body = extension === ".html"
          ? injectStoryblokPreview(file.toString("utf8"))
          : file;
        const headers = {
          "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
          "Accept-Ranges": "bytes",
          "X-Content-Type-Options": "nosniff",
        };
        if (extension === ".html") {
          headers["Content-Security-Policy"] = "frame-ancestors https://app.storyblok.com";
        }
        send(response, 200, body, headers);
      } catch {
        send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
      }
      return;
    }

    send(response, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
  };
};
