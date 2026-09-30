import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const deploymentRevision = "1234567890ab-abcdef123456";
const contentUrl = (path) => `${path}?v=${deploymentRevision}`;

const runContentScript = async (filename, document) => {
  const source = await readFile(new URL(`../../${filename}`, import.meta.url), "utf8");
  let requestedUrl = "";
  const fetch = async (url) => {
    requestedUrl = url;
    return { ok: false, json: async () => null };
  };
  const window = {
    kspfContentUrl: contentUrl,
    addEventListener() {},
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
  };

  vm.runInNewContext(source, { document, fetch, window, console });
  await new Promise((resolve) => setImmediate(resolve));
  return requestedUrl;
};

test("all CMS hydration requests use the deployment content revision", async () => {
  const homeDocument = {
    title: "",
    querySelector(selector) {
      if (selector === ".js-home-intro") return {};
      return null;
    },
  };
  const projectContainer = { textContent: "" };
  const projectsDocument = {
    getElementById(id) {
      return id === "projects" ? projectContainer : null;
    },
  };
  const experienceDocument = {
    querySelector(selector) {
      return selector === ".js-exp-intro" ? {} : null;
    },
  };
  const banner = {
    dataset: { case: "content/case-studies/example.json" },
    closest() {
      return null;
    },
    querySelector() {
      return null;
    },
  };
  const caseStudyDocument = {
    querySelector(selector) {
      return selector === ".case-banner[data-case]" ? banner : null;
    },
    querySelectorAll() {
      return [];
    },
  };

  assert.equal(
    await runContentScript("home-content.js", homeDocument),
    contentUrl("content/home.json")
  );
  assert.equal(
    await runContentScript("render-projects.js", projectsDocument),
    contentUrl("projects.json")
  );
  assert.equal(
    await runContentScript("experience.js", experienceDocument),
    contentUrl("content/experience.json")
  );
  assert.equal(
    await runContentScript("case-study.js", caseStudyDocument),
    contentUrl("content/case-studies/example.json")
  );
});
