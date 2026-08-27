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
const sitePath = join(dir, "content", "site.json");

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

const setAttribute = (openingTag, name, value) => {
  const pattern = new RegExp(`\\s${name}(?:="[^"]*")?`, "i");
  const withoutExisting = openingTag.replace(pattern, "");
  if (value === null || value === undefined || value === false) return withoutExisting;
  const serialized = value === true ? name : `${name}="${escapeAttr(value)}"`;
  return withoutExisting.replace(/>$/, ` ${serialized}>`);
};

const replaceLink = (source, className, { label, href, hidden }) => {
  const escapedClass = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<a\\b(?=[^>]*\\bclass="[^"]*\\b${escapedClass}\\b[^"]*")[^>]*>[\\s\\S]*?<\\/a>`,
    "gi"
  );
  return source.replace(pattern, (link) => {
    const openingEnd = link.indexOf(">");
    let opening = link.slice(0, openingEnd + 1);
    opening = setAttribute(opening, "href", href);
    opening = setAttribute(opening, "hidden", hidden === true ? true : null);
    return `${opening}${escapeHtml(label || "")}</a>`;
  });
};

let html = readFileSync(htmlPath, "utf8");
const home = readJson(homePath);
const site = readJson(sitePath);

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

if (site?.nav) {
  html = replaceLink(html, "nav__link--home", {
    label: site.nav.homeLabel,
    href: site.nav.homeHref,
    hidden: false,
  });
  html = replaceLink(html, "js-information-link", {
    label: site.nav.informationLabel,
    href: site.nav.informationHref,
    hidden: site.nav.showAbout !== true,
  });
}

writeFileSync(htmlPath, html);
console.log(`prerender: wrote ${htmlPath}`);
