#!/usr/bin/env node

import { execFile } from "node:child_process";
import { access, chmod, mkdir, readFile, rename } from "node:fs/promises";
import { createServer as createHttpsServer } from "node:https";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { fetchStoryblokContent, storyblokDeliveryBaseUrl } from "./storyblok-delivery.mjs";
import {
  createPreviewRequestHandler,
  DraftContentStore,
} from "./storyblok-preview-server.mjs";

const execFileAsync = promisify(execFile);

export const getPreviewConfig = (environment = process.env) => {
  const token = environment.STORYBLOK_PREVIEW_TOKEN || "";
  if (!token) {
    throw new Error(
      "Missing STORYBLOK_PREVIEW_TOKEN. Add the Preview delivery token to your untracked .env file."
    );
  }

  const region = String(environment.STORYBLOK_REGION || "eu").toLowerCase();
  storyblokDeliveryBaseUrl(region);
  const port = Number(environment.STORYBLOK_PREVIEW_PORT || 8001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("STORYBLOK_PREVIEW_PORT must be an integer between 1 and 65535.");
  }

  return {
    token,
    region,
    port,
    host: "127.0.0.1",
    spaceId: environment.STORYBLOK_SPACE_ID || "",
  };
};

const exists = async (path) => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const ensureLocalCertificate = async (directory) => {
  const keyPath = join(directory, "localhost-key.pem");
  const certPath = join(directory, "localhost-cert.pem");
  await mkdir(directory, { recursive: true });

  if ((await exists(keyPath)) && (await exists(certPath))) {
    return { keyPath, certPath };
  }

  const suffix = `${process.pid}-${Date.now()}.tmp`;
  const tempKeyPath = join(directory, `localhost-key-${suffix}`);
  const tempCertPath = join(directory, `localhost-cert-${suffix}`);
  try {
    await execFileAsync("openssl", [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-sha256",
      "-nodes",
      "-keyout",
      tempKeyPath,
      "-out",
      tempCertPath,
      "-days",
      "365",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ]);
    await chmod(tempKeyPath, 0o600);
    await rename(tempKeyPath, keyPath);
    await rename(tempCertPath, certPath);
  } catch (error) {
    throw new Error(`Could not create the localhost HTTPS certificate: ${error.message}`);
  }

  return { keyPath, certPath };
};

export const startStoryblokPreview = async ({
  repoRoot,
  certificateDirectory = join(repoRoot, ".storyblok-preview"),
  config,
  fetchImpl = fetch,
  logger = console,
}) => {
  if (!repoRoot || !config) {
    throw new Error("Storyblok preview startup requires repoRoot and config.");
  }

  const { keyPath, certPath } = await ensureLocalCertificate(certificateDirectory);
  const [key, cert] = await Promise.all([readFile(keyPath), readFile(certPath)]);
  const store = new DraftContentStore({
    maxAgeMs: 1000,
    loadSnapshot: async () => {
      const result = await fetchStoryblokContent({
        token: config.token,
        version: "draft",
        region: config.region,
        fetchImpl,
      });
      return result.files;
    },
  });
  await store.refresh();

  const handler = createPreviewRequestHandler({ repoRoot, store });
  const server = createHttpsServer({ key, cert }, handler);
  await new Promise((resolveListen, rejectListen) => {
    const onError = (error) => rejectListen(error);
    server.once("error", onError);
    server.listen(config.port, config.host, () => {
      server.off("error", onError);
      resolveListen();
    });
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : config.port;
  const url = `https://localhost:${port}/`;
  logger.log(`storyblok preview: ${url}`);
  logger.log("Open this URL once and accept the local certificate before using the Visual Editor.");
  return { server, store, url, keyPath, certPath };
};

const currentFile = fileURLToPath(import.meta.url);
const isMain = process.argv[1] && resolve(process.argv[1]) === currentFile;
if (isMain) {
  const repoRoot = resolve(dirname(currentFile), "..");
  try {
    const preview = await startStoryblokPreview({
      repoRoot,
      config: getPreviewConfig(),
    });
    const close = () => preview.server.close(() => process.exit(0));
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  } catch (error) {
    console.error(`storyblok preview: ${error.message}`);
    process.exitCode = 1;
  }
}
