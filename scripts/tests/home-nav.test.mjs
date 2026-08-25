import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import vm from "node:vm";

import { mapSiteStory } from "../storyblok-content.mjs";

const execFileAsync = promisify(execFile);

const siteStory = (showAbout) => ({
  full_slug: "site",
  content: {
    component: "site_settings",
    nav: [
      {
        home_label: "KSPF",
        information_label: "ABOUT",
        show_about: showAbout,
      },
    ],
  },
});

test("maps Storyblok ABOUT visibility with a disabled default", () => {
  assert.equal(mapSiteStory(siteStory(true)).nav.showAbout, true);
  assert.equal(mapSiteStory(siteStory(false)).nav.showAbout, false);
  assert.equal(mapSiteStory(siteStory(undefined)).nav.showAbout, false);
});

const renderAboutVisibility = async (showAbout) => {
  const source = await readFile(new URL("../../site-content.js", import.meta.url), "utf8");
  const attributes = new Map();
  const aboutLink = {
    hidden: false,
    textContent: "About",
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
  const homeLink = {
    textContent: "kspf",
    setAttribute() {},
  };
  const document = {
    querySelectorAll(selector) {
      if (selector === ".nav__link--home") return [homeLink];
      if (selector === ".js-information-link") return [aboutLink];
      return [];
    },
    querySelector(selector) {
      if (selector === ".nav__link--home") return homeLink;
      return null;
    },
  };
  const fetch = async () => ({
    ok: true,
    json: async () => ({
      nav: {
        homeLabel: "KSPF",
        informationLabel: "ABOUT",
        informationHref: "#services",
        showAbout,
      },
    }),
  });

  vm.runInNewContext(source, { document, fetch, console });
  await new Promise((resolve) => setImmediate(resolve));

  return { aboutLink, attributes };
};

test("hides ABOUT when Storyblok disables it", async () => {
  const { aboutLink } = await renderAboutVisibility(false);
  assert.equal(aboutLink.hidden, true);
});

test("shows ABOUT when Storyblok enables it", async () => {
  const { aboutLink } = await renderAboutVisibility(true);
  assert.equal(aboutLink.hidden, false);
});

test("pre-renders the CMS intro into the three-row navigation", async (t) => {
  const targetDir = await mkdtemp(join(tmpdir(), "kspf-home-nav-"));
  t.after(() => rm(targetDir, { recursive: true, force: true }));
  await mkdir(join(targetDir, "content"));
  await writeFile(
    join(targetDir, "index.html"),
    '<html><head><title>Home</title></head><body><p class="intro nav__intro js-home-intro" title="Placeholder">Placeholder</p></body></html>',
    "utf8"
  );
  await writeFile(
    join(targetDir, "content/home.json"),
    JSON.stringify({ intro: "CMS Intro" }),
    "utf8"
  );

  await execFileAsync(process.execPath, [
    new URL("../prerender.mjs", import.meta.url).pathname,
    targetDir,
  ]);

  const html = await readFile(join(targetDir, "index.html"), "utf8");
  assert.match(
    html,
    /<p class="intro nav__intro js-home-intro" title="CMS Intro">\s*CMS Intro\s*<\/p>/
  );
});
