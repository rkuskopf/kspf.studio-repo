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
    if (!opening.includes("data-info-scroll=")) {
      opening = setAttribute(opening, "href", href);
    }
    opening = setAttribute(opening, "hidden", hidden === true ? true : null);
    return `${opening}${escapeHtml(label || "")}</a>`;
  });
};

const replaceElement = (source, tag, className, content, attributes = {}) => {
  const pattern = new RegExp(
    `<${tag}\\b(?=[^>]*\\bclass="[^"]*\\b${className}\\b[^"]*")[^>]*>[\\s\\S]*?<\\/${tag}>`,
    "gi"
  );
  return source.replace(pattern, (element) => {
    let opening = element.slice(0, element.indexOf(">") + 1);
    for (const [name, value] of Object.entries(attributes)) {
      opening = setAttribute(opening, name, value);
    }
    return `${opening}${content}</${tag}>`;
  });
};

let html = readFileSync(htmlPath, "utf8");
const home = readJson(homePath);
const site = readJson(sitePath);

if (home) {
  const captions = home.captions || {};
  html = html.replace(/<html\b[^>]*>/i, opening => {
    let tag = setAttribute(opening, "data-caption-layout", captions.layout || "current");
    for (const key of ["Number", "Title", "Category", "Caption"]) {
      tag = setAttribute(tag, "data-hide-project-" + key.toLowerCase(), String(captions["show" + key] === false));
    }
    return tag;
  });
  html = html.replace(/<html\b[^>]*>/i, (opening) =>
    setAttribute(opening, "data-home-initial-section", home.initialSection === "info" ? "info" : "work")
  );
  html = html.replace(/<header\b(?=[^>]*\bclass="[^"]*\btop\b[^"]*")[^>]*>/i,
    (opening) => setAttribute(opening, "hidden", home.showNavigation === false ? true : null)
  );
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

  if (typeof home.intro === "string") {
    // Replace the intro fallback and hide the row when editors leave it blank.
    html = html.replace(
      /(<p\b(?=[^>]*\bclass="[^"]*\bjs-home-intro\b[^"]*")[^>]*)(>)[\s\S]*?(<\/p>)/i,
      (_m, open, close, end) => {
        const cleanOpen = open
          .replace(/\s+title="[^"]*"/i, "")
          .replace(/\s+hidden(?:="")?/i, "");
        if (!home.intro.trim()) return `${cleanOpen} hidden${close}${end}`;
        return `${cleanOpen} title="${escapeAttr(home.intro)}"${close}\n     ${escapeHtml(
          home.intro
        )}\n    ${end}`;
      }
    );
  }
}

if (site) {
  const info = site.informationOverlay || {};
  for (const [tag, className, value] of [
    ["h1", "js-home-information-title", site.nav?.homeLabel],
    ["h2", "js-info-contact-title", info.contactTitle],
    ["h2", "js-info-services-title", info.servicesTitle],
  ]) {
    if (value !== undefined && value !== null) html = replaceElement(html, tag, className, escapeHtml(value));
  }
  const body = String(info.contactBody || "").trim();
  html = replaceElement(html, "p", "js-info-contact-body",
    body.split("\n").map((line) => escapeHtml(line.trim())).join("<br>"), { hidden: !body });
  const email = String(info.contactEmail || "").replace(/^mailto:/i, "");
  html = replaceElement(html, "a", "js-info-contact-email", escapeHtml(email),
    { hidden: !email, href: email ? `mailto:${email}` : null });
  if (Array.isArray(info.services)) {
    html = replaceElement(html, "ul", "js-info-services-list",
      info.services.filter(Boolean).map((service) => `<li>${escapeHtml(service)}</li>`).join(""));
  }
}

if (typeof site?.profile === "string") {
  html = html.replace(
    /(<p\b[^>]*class="js-home-profile"[^>]*>)[\s\S]*?(<\/p>)/i,
    (_match, open, close) => `${open}${escapeHtml(site.profile)}${close}`
  );
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
