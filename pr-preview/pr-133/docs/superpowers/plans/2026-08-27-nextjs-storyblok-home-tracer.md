# Next.js Storyblok homepage tracer implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the real Storyblok `home` story through a typed Next.js server boundary using published content normally and authenticated saved drafts only inside the local Storyblok Visual Editor.

**Architecture:** Pure TypeScript modules validate Storyblok's signed Visual Editor parameters and fetch/map one story. A `server-only` orchestration module owns environment access, the App Router page consumes only typed content, and a token-free client component reloads after Storyblok Save or Publish events.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 7, Vitest 4, Node.js crypto/fetch, Storyblok Content Delivery API and Bridge v2.

## Global constraints

- Draft preview is local-only and works through HTTPS `next dev`.
- Any request outside `NODE_ENV=development` renders published content, even with valid Storyblok parameters.
- Require the exact `_storyblok`, `_storyblok_tk[space_id]`, `_storyblok_tk[timestamp]`, and `_storyblok_tk[token]` fields and validate Storyblok's SHA-1 signature server-side.
- Accept signed timestamps from one hour ago through 60 seconds in the future.
- Never expose Storyblok delivery tokens to browser-facing code, rendered markup, error messages, or a `NEXT_PUBLIC_` variable.
- Do not add Next.js Draft Mode, preview cookies, a deployable preview endpoint, the Storyblok React SDK, composable blocks, or click-to-edit behavior.
- Do not read generated JSON or import the legacy sync, mapping, or preview modules.
- Do not modify the root static site or GitHub Pages workflows.
- Keep all changes uncommitted for local review.

---

### Task 1: Authenticate real Storyblok Visual Editor parameters

**Files:**
- Create: `next-app/lib/storyblok/types.ts`
- Create: `next-app/lib/storyblok/preview.ts`
- Create: `next-app/lib/storyblok/preview.test.ts`
- Modify: `vitest.config.mts`

**Interfaces:**
- Produces: `StoryblokVersion`, `StoryblokSearchParams`, `StoryblokEnvironment`, `HomeContent`, and `HomePageData` types.
- Produces: `StoryblokConfigurationError` and `resolveStoryblokVersion(options): StoryblokVersion`.
- Consumes later: `server.ts` passes `NODE_ENV`, query parameters, the server-held preview token, and an injectable clock.

- [x] **Step 1: Include TypeScript tests in Vitest discovery**

Change the Vitest include pattern to:

```ts
include: ["next-app/**/*.test.{ts,tsx}"],
```

- [x] **Step 2: Write the failing preview-authentication tests**

Create tests that construct the real bracketed Storyblok keys and compute the expected SHA-1 signature independently:

```ts
const signedParams = (previewToken: string, timestamp: number) => {
  const spaceId = "313862";
  const signature = createHash("sha1")
    .update(`${spaceId}:${previewToken}:${timestamp}`)
    .digest("hex");

  return {
    _storyblok: "580906535",
    "_storyblok_tk[space_id]": spaceId,
    "_storyblok_tk[timestamp]": String(timestamp),
    "_storyblok_tk[token]": signature,
  };
};
```

Assert all of these behaviors:

```ts
expect(resolveStoryblokVersion(validDevelopmentOptions)).toBe("draft");
expect(resolveStoryblokVersion(validProductionOptions)).toBe("published");
expect(resolveStoryblokVersion(arbitraryQueryOptions)).toBe("published");
expect(resolveStoryblokVersion(partialParameterOptions)).toBe("published");
expect(resolveStoryblokVersion(arrayParameterOptions)).toBe("published");
expect(resolveStoryblokVersion(invalidSignatureOptions)).toBe("published");
expect(resolveStoryblokVersion(staleTimestampOptions)).toBe("published");
expect(resolveStoryblokVersion(futureTimestampOptions)).toBe("published");
expect(() => resolveStoryblokVersion(completeParamsWithoutPreviewToken)).toThrow(
  /STORYBLOK_PREVIEW_TOKEN/
);
```

- [x] **Step 3: Run the focused test and confirm RED**

Run:

```sh
npm test -- next-app/lib/storyblok/preview.test.ts
```

Expected: FAIL because `types.ts`, `preview.ts`, and `resolveStoryblokVersion` do not exist.

- [x] **Step 4: Implement the typed preview boundary**

Define these shared types in `types.ts`:

```ts
export type StoryblokVersion = "published" | "draft";

export type StoryblokSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type StoryblokEnvironment = {
  NODE_ENV?: string;
  STORYBLOK_PUBLIC_TOKEN?: string;
  STORYBLOK_PREVIEW_TOKEN?: string;
  STORYBLOK_REGION?: string;
};

export type HomeContent = {
  storyId: number;
  storyUuid: string;
  title: string;
  metaDescription: string;
  intro: string;
};

export type HomePageData = {
  content: HomeContent;
  isPreview: boolean;
};
```

Implement `resolveStoryblokVersion` in `preview.ts` with this public shape:

```ts
export class StoryblokConfigurationError extends Error {}

export function resolveStoryblokVersion({
  nodeEnv,
  searchParams,
  previewToken,
  now = Date.now(),
}: {
  nodeEnv?: string;
  searchParams: StoryblokSearchParams;
  previewToken?: string;
  now?: number;
}): StoryblokVersion;
```

Return `published` immediately unless `nodeEnv === "development"`. Require all four scalar fields before requiring the preview token. Validate positive numeric story and space IDs, an integer timestamp, a 40-character hexadecimal signature, the one-hour/60-second time window, and the documented SHA-1 digest. Decode the provided digest into a buffer and use `timingSafeEqual` only after confirming equal lengths.

- [x] **Step 5: Run the focused test and confirm GREEN**

Run:

```sh
npm test -- next-app/lib/storyblok/preview.test.ts
```

Expected: PASS for valid, malformed, expired, future, incomplete, missing-config, and production-only cases.

---

### Task 2: Fetch and map one home story through a server-only boundary

**Files:**
- Create: `next-app/lib/storyblok/delivery.ts`
- Create: `next-app/lib/storyblok/delivery.test.ts`
- Create: `next-app/lib/storyblok/server.ts`
- Create: `next-app/lib/storyblok/server.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `StoryblokVersion`, `StoryblokEnvironment`, `StoryblokSearchParams`, `HomeContent`, `HomePageData`, and `resolveStoryblokVersion`.
- Produces: `storyblokDeliveryBaseUrl(region): string`, `fetchHomeContent(options): Promise<HomeContent>`, and `loadHomePage(options): Promise<HomePageData>`.
- Consumed later: `app/page.tsx` calls `loadHomePage({ searchParams })` and receives no token or raw response.

- [x] **Step 1: Write the failing delivery tests**

Use an injected `fetchImpl` and assert:

```ts
const published = await fetchHomeContent({
  version: "published",
  token: "public-sentinel",
  region: "ap",
  fetchImpl,
  cacheVersion: 123,
});

expect(published).toEqual({
  storyId: 42,
  storyUuid: "home-uuid",
  title: "kspf.studio",
  metaDescription: "Portfolio",
  intro: "Art Direction + Web Development",
});
```

Verify the published URL uses `https://api-ap.storyblok.com/v2/cdn/stories/home`, `version=published`, and `token=public-sentinel`, while the draft URL uses `version=draft`, `token=preview-sentinel`, and `cv=123`. Verify both requests use `cache: "no-store"` and an `Accept: application/json` header.

Also assert missing public/draft tokens, unsupported regions, non-2xx responses, absent stories, wrong components, invalid IDs/UUIDs, and incorrectly typed `title` or `intro`. For an HTTP error, assert the error contains the status and `home` but not `public-sentinel` or the credential-bearing URL.

- [x] **Step 2: Write the failing orchestration tests**

Mock `server-only` for Vitest before importing `server.ts`. With an injected environment, clock, and fetch implementation, prove:

```ts
expect(normalData.isPreview).toBe(false);
expect(normalRequest.searchParams.get("version")).toBe("published");
expect(normalRequest.searchParams.get("token")).toBe("public-sentinel");

expect(localSignedData.isPreview).toBe(true);
expect(localSignedRequest.searchParams.get("version")).toBe("draft");
expect(localSignedRequest.searchParams.get("token")).toBe("preview-sentinel");

expect(productionSignedData.isPreview).toBe(false);
expect(productionSignedRequest.searchParams.get("version")).toBe("published");
```

Add missing-public-token and complete-local-preview-without-preview-token assertions.

- [x] **Step 3: Run both focused files and confirm RED**

Run:

```sh
npm test -- next-app/lib/storyblok/delivery.test.ts next-app/lib/storyblok/server.test.ts
```

Expected: FAIL because the delivery and server modules do not exist.

- [x] **Step 4: Install the server-only marker**

Run:

```sh
npm install server-only@0.0.1 --save
```

Expected: `package.json` and `package-lock.json` record the dependency without changing the existing Next.js, React, TypeScript, or Vitest versions.

- [x] **Step 5: Implement delivery and runtime validation**

In `delivery.ts`, define the existing region hosts and implement:

```ts
export async function fetchHomeContent({
  version,
  token,
  region = "eu",
  fetchImpl = fetch,
  cacheVersion = Date.now(),
}: {
  version: StoryblokVersion;
  token?: string;
  region?: string;
  fetchImpl?: typeof fetch;
  cacheVersion?: number;
}): Promise<HomeContent>;
```

Use the Storyblok Content Delivery endpoint directly. Add `cv` only for draft content, always use `cache: "no-store"`, never include response body or request URL in errors, and validate/map the response without importing anything from `scripts/` or checked-in JSON.

- [x] **Step 6: Implement the server-only orchestrator**

Start `server.ts` with:

```ts
import "server-only";
```

Implement:

```ts
export async function loadHomePage({
  searchParams,
  environment = process.env,
  fetchImpl = fetch,
  now = Date.now(),
}: {
  searchParams: StoryblokSearchParams;
  environment?: StoryblokEnvironment;
  fetchImpl?: typeof fetch;
  now?: number;
}): Promise<HomePageData>;
```

Resolve the version from signed parameters, select only the matching public or preview token, pass the configured region and injected clock to delivery, and return `{ content, isPreview: version === "draft" }`.

- [x] **Step 7: Run both focused files and confirm GREEN**

Run:

```sh
npm test -- next-app/lib/storyblok/delivery.test.ts next-app/lib/storyblok/server.test.ts
```

Expected: PASS with separate published/draft credentials, forced production publishing, focused configuration failures, and mapped home content.

---

### Task 3: Render typed content and refresh saved drafts

**Files:**
- Create: `next-app/lib/storyblok/bridge.ts`
- Create: `next-app/lib/storyblok/bridge.test.ts`
- Create: `next-app/app/storyblok-preview-bridge.tsx`
- Modify: `next-app/app/page.tsx`
- Modify: `next-app/app/page.test.tsx`

**Interfaces:**
- Consumes: `loadHomePage`, `HomePageData`, and the preview boolean.
- Produces: `subscribeToStoryblokBridge(Bridge, reload): void`, `StoryblokPreviewBridge`, `HomeContentView`, and the async App Router `HomePage` route.
- Browser boundary: only the Bridge URL, event names, reload callback, typed content markup, and `isPreview` state may cross from the server render.

- [x] **Step 1: Write the failing Bridge tests**

Create a fake constructor whose instance captures `on` calls. Assert:

```ts
subscribeToStoryblokBridge(FakeBridge, reload);
expect(registeredEvents).toEqual(["change", "published"]);
registeredCallback();
expect(reload).toHaveBeenCalledOnce();
```

The pure helper must not read tokens, environment variables, or Storyblok API URLs.

- [x] **Step 2: Replace the foundation smoke test with failing typed-render tests**

Test `HomeContentView` directly with published and draft `HomePageData`. Assert the same `title` and `intro` fields render in both cases and expose the expected published/draft render state. Because `next/script` with `afterInteractive` intentionally emits no static markup, verify actual preview-only Bridge script loading in Task 5's HTTPS browser check.

Set `STORYBLOK_PUBLIC_TOKEN` and `STORYBLOK_PREVIEW_TOKEN` to unique sentinels during the render and assert neither appears in the returned HTML. Delivery error tests from Task 2 must also prove that credential-bearing request URLs and token sentinels are redacted. Task 5 completes the boundary check against emitted browser assets.

- [x] **Step 3: Run the focused tests and confirm RED**

Run:

```sh
npm test -- next-app/lib/storyblok/bridge.test.ts next-app/app/page.test.tsx
```

Expected: FAIL because the Bridge helper/component and typed page renderer do not exist.

- [x] **Step 4: Implement the token-free Bridge helper and client component**

In `bridge.ts`, export:

```ts
export const STORYBLOK_BRIDGE_URL =
  "https://app.storyblok.com/f/storyblok-v2-latest.js";

export type StoryblokBridgeConstructor = new () => {
  on(events: string[], callback: () => void): void;
};

export function subscribeToStoryblokBridge(
  Bridge: StoryblokBridgeConstructor,
  reload: () => void
): void;
```

In `storyblok-preview-bridge.tsx`, add `"use client"`, load the URL with `next/script` using `strategy="afterInteractive"`, connect on both `onLoad` and `onReady`, guard against duplicate registration with a ref, and call `window.location.reload()` for the registered callback. The component takes no props.

- [x] **Step 5: Implement the typed server page**

Set:

```ts
export const dynamic = "force-dynamic";
```

Export `HomeContentView({ data }: { data: HomePageData })` and render `content.title` in the heading and `content.intro` in the summary. Render `StoryblokPreviewBridge` only when `data.isPreview` is true.

Make the default route async with Next.js 16's promised search parameters:

```ts
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<StoryblokSearchParams>;
}) {
  const data = await loadHomePage({ searchParams: await searchParams });
  return <HomeContentView data={data} />;
}
```

- [x] **Step 6: Run the focused tests and confirm GREEN**

Run:

```sh
npm test -- next-app/lib/storyblok/bridge.test.ts next-app/app/page.test.tsx
```

Expected: PASS for identical typed rendering, preview-only Bridge loading, Save/Publish refresh registration, and token-free output.

---

### Task 4: Make local HTTPS preview usable and document setup

**Files:**
- Create: `next-app/next.config.test.ts`
- Modify: `next-app/next.config.ts`
- Modify: `package.json`
- Modify: `next-app/.env.example`
- Modify: `next-app/README.md`

**Interfaces:**
- Consumes: Storyblok's requirement for HTTPS and its `https://app.storyblok.com` editor iframe.
- Produces: `npm run dev` HTTPS startup, a scoped `frame-ancestors` response header, and exact local setup/verification instructions.

- [x] **Step 1: Write failing configuration tests**

Import the Next config and invoke its `headers()` function. Assert:

```ts
expect(frameAncestorsHeader).toEqual({
  key: "Content-Security-Policy",
  value: "frame-ancestors https://app.storyblok.com",
});
```

- [x] **Step 2: Run the configuration test and confirm RED**

Run:

```sh
npm test -- next-app/next.config.test.ts
```

Expected: FAIL because no frame-ancestor header exists.

- [x] **Step 3: Enable HTTPS and Visual Editor framing**

Change the development script to:

```json
"dev": "next dev next-app --experimental-https"
```

Add an async `headers()` function to `next.config.ts` that returns the `Content-Security-Policy: frame-ancestors https://app.storyblok.com` header for `/:path*`. Do not modify the root static site or its headers.

- [x] **Step 4: Document the minimum setup**

Keep `next-app/.env.example` credential-free and document these variables:

```text
STORYBLOK_PUBLIC_TOKEN=
STORYBLOK_PREVIEW_TOKEN=
STORYBLOK_REGION=eu
```

Update `next-app/README.md` to state:

- copy the example to ignored `next-app/.env.local`;
- use a Public token for normal published delivery and a Preview token for local draft delivery;
- run `npm run dev` and accept the local certificate at `https://localhost:3000/` once;
- set the Storyblok Visual Editor Preview URL to `https://localhost:3000/` and the `home` story Real path to `/`;
- Save or Publish reloads the iframe with the latest draft;
- invalid/partial Storyblok parameters and every non-development runtime render published content;
- no Draft Mode endpoint exists in this slice; and
- run `npm test`, `node --test scripts/tests/*.test.mjs`, and `npm run build` for verification.

- [x] **Step 5: Run the configuration test and confirm GREEN**

Run:

```sh
npm test -- next-app/next.config.test.ts
```

Expected: PASS for Storyblok frame permission. Task 5 verifies the HTTPS command by starting the real development server.

---

### Task 5: Verify automated, build, legacy, secret, and live behavior

**Files:**
- Modify only if verification exposes an issue: files already listed in Tasks 1-4

**Interfaces:**
- Consumes: every #58 implementation boundary and the unchanged root static pipeline.
- Produces: fresh evidence for all issue acceptance criteria and a reviewable uncommitted diff.

- [x] **Step 1: Run every Next.js/Vitest test**

Run:

```sh
npm test
```

Expected: all preview, delivery, server, rendering, Bridge, configuration, and foundation tests pass with zero failures.

- [x] **Step 2: Run the unchanged legacy suite**

Run:

```sh
node --test scripts/tests/*.test.mjs
```

Expected: the current static Storyblok, preview, deployment, slideshow, navigation, and cache tests remain green.

- [x] **Step 3: Build the Next.js application without exposing tokens**

Run with unique temporary environment sentinels:

```sh
STORYBLOK_PUBLIC_TOKEN=kspf-public-build-sentinel \
STORYBLOK_PREVIEW_TOKEN=kspf-preview-build-sentinel \
STORYBLOK_REGION=eu \
npm run build
```

Expected: the production build succeeds without fetching draft content. Then search `next-app/.next/static` and generated HTML for both sentinels; expect zero matches.

- [x] **Step 4: Verify the real published and draft story when credentials exist**

Without printing credentials, confirm the needed root `.env` or `next-app/.env.local` variable names are populated. Start HTTPS Next development with those variables, fetch `https://localhost:3000/`, and confirm the rendered heading/intro match a direct `version=published` Storyblok response.

Generate the documented `_storyblok` and signed `_storyblok_tk[...]` URL locally from the preview token without logging the token. Fetch that URL and confirm the rendered heading/intro match `version=draft`. Repeat with a broken signature and confirm it matches published content. Trigger or simulate the Bridge `change` callback and confirm a reload performs a new draft request.

If credentials are unavailable, report live verification as the only unverified acceptance item rather than claiming it passed.

- [x] **Step 5: Inspect final scope and diff quality**

Run:

```sh
git diff --check
git status --short
git diff --stat
git diff -- . ':!next-app/.next'
```

Expected: only the #58 spec/plan, `next-app` Storyblok tracer, package metadata, and Next setup docs changed; no root static files, generated JSON, legacy scripts, deployment workflows, credentials, or build artifacts are tracked.
