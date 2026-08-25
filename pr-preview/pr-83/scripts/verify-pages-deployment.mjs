#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const readResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 400) };
  }
};

const attemptsFor = (timeoutMs, intervalMs) =>
  Math.max(1, Math.ceil(Math.max(1, timeoutMs) / Math.max(1, intervalMs)));

export const verifyPagesDeployment = async ({
  repo,
  token,
  expectedCommit,
  expectedSourceRevision,
  expectedDeploymentRevision,
  siteUrl,
  expectedCname,
  requestBuild = false,
  timeoutMs = 6 * 60 * 1000,
  intervalMs = 5 * 1000,
  apiBaseUrl = "https://api.github.com",
  fetchImpl = fetch,
  wait = delay,
}) => {
  if (!repo || !repo.includes("/")) throw new Error("A repository in owner/name form is required.");
  if (!token) throw new Error("A GitHub token is required to verify Pages.");
  if (!/^[a-f0-9]{40}$/i.test(expectedCommit || "")) {
    throw new Error("The expected gh-pages commit must be a full 40-character Git SHA.");
  }
  if (!/^[a-f0-9]{40}$/i.test(expectedSourceRevision || "")) {
    throw new Error("The expected source revision must be a full 40-character Git SHA.");
  }
  if (!/^[a-f0-9]{12}-[a-f0-9]{12}$/i.test(expectedDeploymentRevision || "")) {
    throw new Error("The expected deployment revision must contain the source and content hashes.");
  }
  const liveUrl = new URL(siteUrl);
  if (liveUrl.protocol !== "https:") throw new Error("The production site URL must use HTTPS.");

  const githubHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const githubRequest = async (path, options = {}) => {
    const response = await fetchImpl(`${apiBaseUrl}/repos/${repo}/${path}`, {
      ...options,
      headers: { ...githubHeaders, ...(options.headers || {}) },
    });
    return { response, data: await readResponse(response) };
  };

  if (requestBuild) {
    const { response, data } = await githubRequest("pages/builds", { method: "POST" });
    if (response.status !== 201 && response.status !== 409 && response.status !== 422) {
      throw new Error(
        `Could not request the GitHub Pages build (${response.status}): ${data.message || "unknown error"}`
      );
    }
  }

  const maxAttempts = attemptsFor(timeoutMs, intervalMs);
  let build = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { response, data } = await githubRequest("pages/builds/latest");
    if (!response.ok) {
      throw new Error(
        `Could not read the latest GitHub Pages build (${response.status}): ${data.message || "unknown error"}`
      );
    }
    if (data.commit === expectedCommit) {
      if (data.status === "built") {
        build = data;
        break;
      }
      if (new Set(["errored", "cancelled"]).has(data.status)) {
        const detail = data.error?.message || data.error || data.status;
        throw new Error(`GitHub Pages build failed for ${expectedCommit}: ${detail}`);
      }
    }
    if (attempt + 1 < maxAttempts) await wait(intervalMs);
  }
  if (!build) {
    throw new Error(`Timed out waiting for GitHub Pages to build ${expectedCommit}.`);
  }

  const { response: pagesResponse, data: pages } = await githubRequest("pages");
  if (!pagesResponse.ok) {
    throw new Error(
      `Could not read GitHub Pages configuration (${pagesResponse.status}): ${pages.message || "unknown error"}`
    );
  }
  if (expectedCname && pages.cname !== expectedCname) {
    throw new Error(`GitHub Pages CNAME is "${pages.cname || "unset"}", expected "${expectedCname}".`);
  }
  if (pages.https_enforced !== true) {
    throw new Error(`GitHub Pages HTTPS enforcement is disabled for ${liveUrl.hostname}.`);
  }

  let manifest = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const manifestUrl = new URL("deployment.json", liveUrl);
    manifestUrl.searchParams.set("v", expectedCommit);
    manifestUrl.searchParams.set("attempt", String(attempt + 1));
    const response = await fetchImpl(manifestUrl, { cache: "no-store" });
    const data = await readResponse(response);
    if (
      response.ok &&
      data.sourceRevision === expectedSourceRevision &&
      data.deploymentRevision === expectedDeploymentRevision
    ) {
      manifest = data;
      break;
    }
    if (attempt + 1 < maxAttempts) await wait(intervalMs);
  }
  if (!manifest) {
    throw new Error(
      `GitHub Pages built ${expectedCommit}, but ${liveUrl.origin} did not serve deployment revision ${expectedDeploymentRevision} from source ${expectedSourceRevision}.`
    );
  }

  return { build, pages, manifest };
};

const option = (args, name, fallback = "") => {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
};

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && realpathSync(resolve(process.argv[1])) === realpathSync(currentFile)) {
  const args = process.argv.slice(2);
  const expectedCommit = option(args, "--commit");
  const expectedSourceRevision = option(args, "--source-revision");
  const expectedDeploymentRevision = option(args, "--deployment-revision");
  const result = await verifyPagesDeployment({
    repo: option(args, "--repo", process.env.GITHUB_REPOSITORY),
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
    expectedCommit,
    expectedSourceRevision,
    expectedDeploymentRevision,
    siteUrl: option(args, "--site-url", "https://kspf.au"),
    expectedCname: option(args, "--cname", "kspf.au"),
    requestBuild: args.includes("--request-build"),
  });
  console.log(
    `pages: verified ${result.build.commit} serving source ${result.manifest.sourceRevision}`
  );
}
