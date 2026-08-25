import assert from "node:assert/strict";
import test from "node:test";

import { verifyPagesDeployment } from "../verify-pages-deployment.mjs";

const response = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

test("requests and verifies the exact legacy Pages build and live source revision", async () => {
  const expectedCommit = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const expectedSourceRevision = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const expectedDeploymentRevision = "bbbbbbbbbbbb-cccccccccccc";
  let latestBuildRequests = 0;
  let buildRequests = 0;
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/pages/builds") && options.method === "POST") {
      buildRequests += 1;
      return response(201, { status: "queued" });
    }
    if (parsed.pathname.endsWith("/pages/builds/latest")) {
      latestBuildRequests += 1;
      return response(
        200,
        latestBuildRequests === 1
          ? { status: "built", commit: "old" }
          : { status: "built", commit: expectedCommit }
      );
    }
    if (parsed.pathname.endsWith("/pages")) {
      return response(200, { cname: "kspf.au", https_enforced: true });
    }
    if (parsed.hostname === "kspf.au" && parsed.pathname === "/deployment.json") {
      return response(200, {
        sourceRevision: expectedSourceRevision,
        contentRevision: "c".repeat(64),
        deploymentRevision: expectedDeploymentRevision,
      });
    }
    throw new Error(`Unexpected request: ${options.method || "GET"} ${url}`);
  };

  const result = await verifyPagesDeployment({
    repo: "rkuskopf/kspf.studio-repo",
    token: "test-token",
    expectedCommit,
    expectedSourceRevision,
    expectedDeploymentRevision,
    siteUrl: "https://kspf.au",
    expectedCname: "kspf.au",
    requestBuild: true,
    timeoutMs: 100,
    intervalMs: 1,
    fetchImpl,
    wait: async () => {},
  });

  assert.equal(buildRequests, 1);
  assert.equal(latestBuildRequests, 2);
  assert.equal(result.build.commit, expectedCommit);
  assert.equal(result.manifest.sourceRevision, expectedSourceRevision);
});

test("continues when GitHub reports that an automatic Pages build is already queued", async () => {
  const expectedCommit = "dddddddddddddddddddddddddddddddddddddddd";
  const expectedSourceRevision = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const expectedDeploymentRevision = "eeeeeeeeeeee-ffffffffffff";
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/pages/builds") && options.method === "POST") {
      return response(409, { message: "A build is already in progress" });
    }
    if (parsed.pathname.endsWith("/pages/builds/latest")) {
      return response(200, { status: "built", commit: expectedCommit });
    }
    if (parsed.pathname.endsWith("/pages")) {
      return response(200, { cname: "kspf.au", https_enforced: true });
    }
    if (parsed.hostname === "kspf.au") {
      return response(200, {
        sourceRevision: expectedSourceRevision,
        contentRevision: "f".repeat(64),
        deploymentRevision: "eeeeeeeeeeee-ffffffffffff",
      });
    }
    throw new Error(`Unexpected request: ${options.method || "GET"} ${url}`);
  };

  const result = await verifyPagesDeployment({
    repo: "rkuskopf/kspf.studio-repo",
    token: "test-token",
    expectedCommit,
    expectedSourceRevision,
    expectedDeploymentRevision,
    siteUrl: "https://kspf.au",
    expectedCname: "kspf.au",
    requestBuild: true,
    timeoutMs: 100,
    intervalMs: 1,
    fetchImpl,
    wait: async () => {},
  });
  assert.equal(result.build.commit, expectedCommit);
});

test("fails visibly when Pages builds the expected commit with an error", async () => {
  const expectedCommit = "1111111111111111111111111111111111111111";
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/pages/builds/latest")) {
      return response(200, { status: "errored", commit: expectedCommit, error: { message: "bad" } });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    verifyPagesDeployment({
      repo: "rkuskopf/kspf.studio-repo",
      token: "test-token",
      expectedCommit,
      expectedSourceRevision: "2222222222222222222222222222222222222222",
      expectedDeploymentRevision: "222222222222-333333333333",
      siteUrl: "https://kspf.au",
      requestBuild: false,
      timeoutMs: 100,
      intervalMs: 1,
      fetchImpl,
      wait: async () => {},
    }),
    /Pages build failed.*bad/i
  );
});

test("rejects stale Storyblok content even when the main source revision is unchanged", async () => {
  const expectedCommit = "4444444444444444444444444444444444444444";
  const expectedSourceRevision = "5555555555555555555555555555555555555555";
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/pages/builds/latest")) {
      return response(200, { status: "built", commit: expectedCommit });
    }
    if (parsed.pathname.endsWith("/pages")) {
      return response(200, { cname: "kspf.au", https_enforced: true });
    }
    if (parsed.hostname === "kspf.au") {
      return response(200, {
        sourceRevision: expectedSourceRevision,
        contentRevision: "6".repeat(64),
        deploymentRevision: "555555555555-666666666666",
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    verifyPagesDeployment({
      repo: "rkuskopf/kspf.studio-repo",
      token: "test-token",
      expectedCommit,
      expectedSourceRevision,
      expectedDeploymentRevision: "555555555555-777777777777",
      siteUrl: "https://kspf.au",
      expectedCname: "kspf.au",
      timeoutMs: 2,
      intervalMs: 1,
      fetchImpl,
      wait: async () => {},
    }),
    /did not serve deployment revision/i
  );
});

test("rejects a Pages configuration that does not enforce HTTPS", async () => {
  const expectedCommit = "7777777777777777777777777777777777777777";
  const expectedSourceRevision = "8888888888888888888888888888888888888888";
  const expectedDeploymentRevision = "888888888888-999999999999";
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/pages/builds/latest")) {
      return response(200, { status: "built", commit: expectedCommit });
    }
    if (parsed.pathname.endsWith("/pages")) {
      return response(200, { cname: "kspf.au", https_enforced: false });
    }
    if (parsed.hostname === "kspf.au") {
      return response(200, {
        sourceRevision: expectedSourceRevision,
        contentRevision: "9".repeat(64),
        deploymentRevision: expectedDeploymentRevision,
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  await assert.rejects(
    verifyPagesDeployment({
      repo: "rkuskopf/kspf.studio-repo",
      token: "test-token",
      expectedCommit,
      expectedSourceRevision,
      expectedDeploymentRevision,
      siteUrl: "https://kspf.au",
      expectedCname: "kspf.au",
      timeoutMs: 2,
      intervalMs: 1,
      fetchImpl,
      wait: async () => {},
    }),
    /HTTPS enforcement is disabled/i
  );
});
