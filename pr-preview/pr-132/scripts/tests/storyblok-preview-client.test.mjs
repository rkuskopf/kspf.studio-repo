import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const clientUrl = new URL("../storyblok-preview-client.js", import.meta.url);

test("refreshes draft content before reloading after a Storyblok save", async () => {
  const source = await readFile(clientUrl, "utf8").catch(() => "");
  assert.ok(source, "Storyblok preview client must exist");

  const handlers = new Map();
  const requests = [];
  let reloads = 0;
  class FakeBridge {
    on(events, handler) {
      const names = Array.isArray(events) ? events : [events];
      names.forEach((event) => handlers.set(event, handler));
    }
  }
  const window = {
    StoryblokBridge: FakeBridge,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return { ok: true };
    },
    location: { reload: () => { reloads += 1; } },
  };

  vm.runInNewContext(source, { window, console });
  assert.equal(typeof handlers.get("change"), "function");
  assert.equal(typeof handlers.get("published"), "function");

  await handlers.get("change")();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/__storyblok/refresh");
  assert.equal(requests[0].options.method, "POST");
  assert.equal(requests[0].options.cache, "no-store");
  assert.equal(reloads, 1);
});
