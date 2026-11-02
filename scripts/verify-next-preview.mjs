#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Read-only checks. Never log request URLs containing signed editor parameters.
const [target, ...flags] = process.argv.slice(2);
if (!target || flags.some(flag => flag !== '--with-drafts')) {
  console.error('Usage: node --env-file=next-app/.env.local scripts/verify-next-preview.mjs <origin> [--with-drafts]');
  process.exit(1);
}
const origin = new URL(target);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
assert(origin.protocol === 'https:' || (local && origin.protocol === 'http:'), 'Use HTTPS outside localhost');
assert(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/', 'Supply an origin only');
assert(!['kspf.au', 'www.kspf.au'].includes(origin.hostname), 'This checker targets a separate Next.js preview, never kspf.au');
const canonicalOrigin = new URL(process.env.SITE_URL || origin.origin).origin;
const secrets = [process.env.STORYBLOK_PUBLIC_TOKEN, process.env.STORYBLOK_PREVIEW_TOKEN].filter(Boolean);
const headers = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {};
const get = async (path) => {
  const response = await fetch(new URL(path, origin), { headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  assert(secrets.every(secret => !html.includes(secret)), 'Delivery credential found in response');
  return { response, html };
};
const checkPage = async (path, version, canonicalPath) => {
  const { response, html } = await get(path);
  assert.equal(response.status, 200, `Expected ${version} page, got HTTP ${response.status}`);
  assert(html.includes(`data-storyblok-content="${version}"`), `Expected ${version} content`);
  assert(response.headers.get('cache-control')?.includes('no-store'), 'Page must not be stored in a shared cache');
  assert(response.headers.get('x-robots-tag')?.includes('noindex'), 'Missing preview noindex header');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer', 'Signed URLs must not leak through referrers');
  assert(response.headers.get('content-security-policy')?.includes('frame-ancestors https://app.storyblok.com'), 'Storyblok iframe policy missing');
  const canonical = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
  assert(canonical, 'Canonical URL missing');
  assert.equal(new URL(canonical).href, new URL(canonicalPath, canonicalOrigin).href, 'Incorrect canonical URL');
  return html;
};
try {
  const home = await checkPage('/', 'published', '/');
  await checkPage('/projects/product-design-tracer', 'published', '/projects/product-design-tracer');
  for (const path of ['/projects/preview-verification-missing', '/experience', '/crm']) {
    assert.equal((await get(path)).response.status, 404, `Expected deliberate 404 at ${path}`);
  }
  for (const path of ['/home', '/index.html']) {
    const { response } = await get(path);
    assert.equal(response.status, 307, `Expected temporary redirect at ${path}`);
    const location = new URL(response.headers.get('location'), origin);
    assert.equal(location.origin, origin.origin, 'Redirect must stay on the preview');
    assert.equal(location.pathname, '/');
  }
  const assets = [...new Set([...home.matchAll(/<(?:img|video)\b[^>]*\bsrc="([^"]+)"/gi)].map(m => m[1].replaceAll('&amp;', '&')))];
  assert(assets.length > 0, 'Homepage contains no media');
  for (const asset of assets) {
    const url = new URL(asset, origin);
    assert(url.protocol === 'https:' || (local && url.origin === origin.origin), 'Insecure asset URL');
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
    assert(response.ok, `Media request failed (HTTP ${response.status})`);
  }
  const chunks = [...new Set([...home.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)].map(m => m[1].replaceAll('&amp;', '&')))];
  for (const chunk of chunks) {
    const url = new URL(chunk, origin);
    if (url.origin === origin.origin) {
      const { response } = await get(url.pathname + url.search);
      assert.equal(response.status, 200, 'Browser JavaScript chunk unavailable');
    }
  }
  console.log(`PASS published Home/tracer, 404s, redirects, metadata, headers, ${assets.length} media URLs and ${chunks.length} script chunks`);
  if (flags.includes('--with-drafts')) {
    const token = process.env.STORYBLOK_PREVIEW_TOKEN;
    const spaceId = process.env.STORYBLOK_SPACE_ID;
    assert(token && /^[1-9]\d*$/.test(spaceId || ''), 'Set STORYBLOK_PREVIEW_TOKEN and STORYBLOK_SPACE_ID for draft checks');
    const regionHosts = { eu: 'api.storyblok.com', us: 'api-us.storyblok.com', ca: 'api-ca.storyblok.com', ap: 'api-ap.storyblok.com', cn: 'app.storyblokchina.cn' };
    const host = regionHosts[process.env.STORYBLOK_REGION || 'eu'];
    assert(host, 'Unsupported Storyblok region');
    for (const [slug, path] of [['home', '/'], ['projects/product-design-tracer', '/projects/product-design-tracer']]) {
      const api = new URL(`https://${host}/v2/cdn/stories/${slug}`);
      api.search = new URLSearchParams({ token, version: 'draft', cv: String(Date.now()) });
      const storyResponse = await fetch(api, { signal: AbortSignal.timeout(30000) });
      assert(storyResponse.ok, 'Could not read saved Storyblok draft');
      const { story } = await storyResponse.json();
      assert(story?.id, 'Draft story missing');
      const timestamp = Math.floor(Date.now() / 1000);
      const sign = (time) => new URLSearchParams({
        _storyblok: String(story.id), '_storyblok_tk[space_id]': spaceId,
        '_storyblok_tk[timestamp]': String(time),
        '_storyblok_tk[token]': createHash('sha1').update(`${spaceId}:${token}:${time}`).digest('hex'),
      });
      await checkPage(`${path}?${sign(timestamp)}`, 'draft', path);
      const invalid = sign(timestamp); invalid.set('_storyblok_tk[token]', '0'.repeat(40));
      const duplicate = sign(timestamp); duplicate.append('_storyblok', String(story.id));
      for (const query of [invalid, duplicate, sign(timestamp - 3601), sign(timestamp + 120)]) {
        await checkPage(`${path}?${query}`, 'published', path);
      }
      await checkPage(path, 'published', path); // No persistent preview state after a signed visit.
    }
    console.log('PASS signed Home/tracer drafts; forged, duplicate, expired and future signatures rejected; no preview state persists');
  } else {
    console.log('Draft checks NOT RUN; rerun with --with-drafts before completing #74');
  }
} catch (error) {
  // Avoid stack traces/request URLs, which may contain delivery tokens or editor signatures.
  let message = error instanceof assert.AssertionError ? error.message : 'Network or configuration error during preview verification';
  for (const secret of secrets) message = message.replaceAll(secret, '[redacted]');
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}
