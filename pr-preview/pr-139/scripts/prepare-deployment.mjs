#!/usr/bin/env node

import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const walkFiles = async (dir, { skip = new Set() } = {}) => {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(path, { skip })));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
};

const contentFiles = async (targetDir) => {
  const files = [];
  const contentDir = join(targetDir, "content");
  try {
    files.push(...(await walkFiles(contentDir)));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try {
    await readFile(join(targetDir, "projects.json"));
    files.push(join(targetDir, "projects.json"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return files.filter((path) => path.endsWith(".json")).sort();
};

const hashContent = async (targetDir) => {
  const hash = createHash("sha256");
  const files = await contentFiles(targetDir);
  if (!files.length) throw new Error("Deployment contains no generated Storyblok JSON files.");
  for (const path of files) {
    hash.update(relative(targetDir, path));
    hash.update("\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return hash.digest("hex");
};

const stampHtml = (html, deploymentRevision) => {
  const meta = `<meta name="kspf-deployment-revision" content="${deploymentRevision}">`;
  const metaPattern = /<meta\s+name="kspf-deployment-revision"\s+content="[^"]*"\s*\/?>/i;
  let stamped = metaPattern.test(html)
    ? html.replace(metaPattern, meta)
    : html.replace(/<head\b[^>]*>/i, (head) => `${head}\n  ${meta}`);

  stamped = stamped.replace(
    /\b(src|href)="([^"?#]+\.(?:css|js))(?:\?[^"#]*)?(#[^"]*)?"/gi,
    (match, attribute, path, fragment = "") => {
      if (/^(?:[a-z]+:)?\/\//i.test(path) || /^(?:data|mailto):/i.test(path)) return match;
      return `${attribute}="${path}?v=${deploymentRevision}${fragment}"`;
    }
  );
  return stamped;
};

export const prepareDeployment = async ({ targetDir, sourceRevision }) => {
  if (!/^[a-f0-9]{7,64}$/i.test(sourceRevision || "")) {
    throw new Error("A Git source revision of 7 to 64 hexadecimal characters is required.");
  }

  const root = resolve(targetDir);
  const contentRevision = await hashContent(root);
  const deploymentRevision = `${sourceRevision.slice(0, 12)}-${contentRevision.slice(0, 12)}`;
  const htmlFiles = (
    await walkFiles(root, { skip: new Set([".git", "node_modules", "pr-preview"]) })
  ).filter((path) => path.endsWith(".html"));

  for (const path of htmlFiles) {
    const html = await readFile(path, "utf8");
    await writeFile(path, stampHtml(html, deploymentRevision), "utf8");
  }

  const manifest = { sourceRevision, contentRevision, deploymentRevision };
  await writeFile(join(root, "deployment.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
};

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(currentFile)) {
  const targetDir = process.argv[2] || ".";
  const sourceRevision = process.argv[3] || process.env.GITHUB_SHA;
  const manifest = await prepareDeployment({ targetDir, sourceRevision });
  console.log(
    `deployment: prepared ${basename(resolve(targetDir))} at ${manifest.deploymentRevision}`
  );
}
