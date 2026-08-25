#!/usr/bin/env node
// Bake CMS content into index.html so the correct text is in the initial HTML.
//
// The site is CMS-driven: content lives in content/*.json and is hydrated into
// the page by home-content.js / site-content.js after a fetch. That fetch
// round-trip means the hardcoded placeholder text in index.html is visible for
// a beat before being swapped for the real content ("old text flashes, then
// switches"). Running this at deploy time replaces the placeholders with the
// real content, so first paint is already correct. The hydration JS then sets
// the identical text, which is a no-op — no visible swap.
//
// Usage: node scripts/prerender.mjs [targetDir]   (targetDir defaults to ".")

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] || ".";
const htmlPath = join(dir, "index.html");
const homePath = join(dir, "content", "home.json");

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttr = (s) => escapeHtml(s).replace(/"/g, "&quot;");

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.warn(`prerender: skipping ${path} (${err.message})`);
    return null;
  }
};

let html = readFileSync(htmlPath, "utf8");
const home = readJson(homePath);

if (home) {
  if (home.title) {
    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(home.title)}</title>`
    );
  }

  if (typeof home.metaDescription === "string" && home.metaDescription) {
    html = html.replace(
      /(<meta\s+name="description"\s+content=")[\s\S]*?(")/i,
      `$1${escapeAttr(home.metaDescription)}$2`
    );
  }

  if (typeof home.intro === "string" && home.intro) {
    // Replace the inner text of the intro paragraph and keep its title in sync.
    html = html.replace(
      /(<p\b(?=[^>]*\bclass="[^"]*\bjs-home-intro\b[^"]*")[^>]*)(>)[\s\S]*?(<\/p>)/i,
      (_m, open, close, end) =>
        `${open.replace(/\s+title="[^"]*"/i, "")} title="${escapeAttr(home.intro)}"${close}\n     ${escapeHtml(
          home.intro
        )}\n    ${end}`
    );
  }
}

writeFileSync(htmlPath, html);
console.log(`prerender: wrote ${htmlPath}`);
