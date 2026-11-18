import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { Window } from 'happy-dom';

const video = 'https://res.cloudinary.com/demo/video/upload/v1/opening.mp4';
const image = 'https://a.storyblok.com/f/123/1200x800/hash/image.jpg';

async function setup(t, projects) {
  const window = new Window({ url: 'https://localhost:8001/' });
  t.after(() => window.happyDOM.abort());
  const { document } = window;
  document.body.dataset.page = 'home';
  document.body.innerHTML = '<div id="projects"></div>';
  window.kspfMediaDimensions = { [video]: [864, 1080] };
  window.requestAnimationFrame = () => 1;
  window.setTimeout = () => 1;
  const observers = [];
  const probes = [];
  const context = vm.createContext({ window, document, console,
    Image: class { set src(value) { probes.push(value); } },
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      targets = [];
      observe(target) { this.targets.push(target); }
      unobserve() {}
    },
    fetch: async () => ({ ok: true, json: async () => ({ projects }) }),
  });
  for (const file of ['media-layout.js', 'slideshow.js', 'render-projects.js']) {
    const source = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8').catch(error => {
      if (file === 'media-layout.js' && error.code === 'ENOENT') return '';
      throw error;
    });
    vm.runInContext(source, context);
  }
  await new Promise(resolve => setImmediate(resolve));
  return { window, document, observers, probes };
}

test('home geometry is reserved synchronously without fetching slideshow aspect probes', async t => {
  const { document, probes } = await setup(t, [{ title: 'Mixed', slides: [video, image] }]);
  const hero = document.querySelector('.hero');
  assert.equal(hero.dataset.frameReserved, '1');
  assert.equal(hero.classList.contains('has-portrait'), true);
  assert.equal(hero.style.getPropertyValue('--hero-aspect'), '1.5');
  assert.deepEqual(probes, [], 'reserved home frames must not probe or preload other slides');
  assert.equal(hero.style.getPropertyValue('--hero-mobile-landscape-aspect'), '1.5');
});

test('video-first project has a lightweight poster and offscreen video has no source', async t => {
  const { document } = await setup(t, [
    { title: 'First', slides: [video] }, { title: 'Later', slides: [video] },
  ]);
  const heroes = [...document.querySelectorAll('.hero')];
  assert.ok(heroes[0].querySelector('.hero__poster'), 'video needs a lightweight poster');
  assert.match(heroes[0].querySelector('.hero__poster').src, /\/video\/upload\/so_0,w_540,q_auto,f_jpg\/v1\/opening\.jpg$/);
  assert.equal(heroes[0].querySelector('.hero__poster').fetchPriority, 'high');
  assert.equal(heroes[1].querySelector('video').getAttribute('src'), null);
  assert.equal(heroes[1].dataset.slideshowInit, undefined);
});

test('failed current media leaves a readable fallback and usable slideshow controls', async t => {
  const { document } = await setup(t, [{ title: 'Broken', slides: [image, video] }]);
  const hero = document.querySelector('.hero');
  const before = hero.style.cssText;
  hero.querySelector('img.is-active').dispatchEvent(new document.defaultView.Event('error'));
  assert.ok(hero.querySelector('.hero__status'), 'media needs a visible failure fallback');
  assert.match(hero.querySelector('.hero__status').textContent, /unavailable/i);
  assert.equal(hero.querySelector('.hero__status').hidden, false);
  assert.equal(hero.style.cssText, before, 'failure cannot resize the reserved frame');
  hero.querySelector('.hero__hit--next').click();
  hero.querySelector('video[data-source]').dispatchEvent(new document.defaultView.Event('playing'));
  assert.ok(hero.querySelector('video.is-active'), 'the next slide remains accessible');
});

test('unknown dimensions retain a reserved fallback when intrinsic media dimensions arrive', async t => {
  const { document } = await setup(t, [{ title: 'New asset', slides: ['/unknown.jpg'] }]);
  const hero = document.querySelector('.hero');
  const before = hero.style.cssText;
  assert.equal(hero.dataset.frameReserved, '1');
  assert.equal(hero.classList.contains('has-portrait'), true);
  const media = hero.querySelector('img.is-active');
  Object.defineProperties(media, { naturalWidth: { value: 1600 }, naturalHeight: { value: 900 } });
  media.dispatchEvent(new document.defaultView.Event('load'));
  assert.equal(hero.style.cssText, before);
  assert.equal(media.classList.contains('is-orientation-pending'), false);
});

test('pending JSON readiness cannot hide the homepage body', async t => {
  const window = new Window();
  t.after(() => window.happyDOM.abort());
  const css = await readFile(new URL('../../style.css', import.meta.url), 'utf8');
  window.document.head.innerHTML = `<style>${css}</style>`;
  window.document.documentElement.className = 'home-scroll-pending';
  window.document.body.dataset.page = 'home';
  assert.notEqual(window.getComputedStyle(window.document.body).visibility, 'hidden');
});

test('empty media shows a fallback without requesting an undefined source', async t => {
  const { document } = await setup(t, [{ title: 'No media', slides: [] }]);
  const hero = document.querySelector('.hero');
  assert.match(hero.querySelector('.hero__status').textContent, /unavailable/i);
  assert.equal(hero.querySelector('img.is-active'), null);
  assert.equal(hero.classList.contains('is-single'), true);
});

test('video failure survives later poster events and paints above the poster', async t => {
  const { document, window } = await setup(t, [{ title: 'Failed video', slides: [video] }]);
  document.head.innerHTML = `<style>${await readFile(new URL('../../style.css', import.meta.url), 'utf8')}</style>`;
  const hero = document.querySelector('.hero');
  const media = hero.querySelector('video.is-active');
  const poster = hero.querySelector('.hero__poster');
  const status = hero.querySelector('.hero__status');
  media.play = async () => { throw new Error('Video unavailable'); };
  hero.querySelector('.hero__play').click();
  media.dispatchEvent(new window.Event('error'));
  await new Promise(resolve => setImmediate(resolve));
  assert.match(status.textContent, /unavailable/i);
  poster.dispatchEvent(new window.Event('load'));
  assert.match(status.textContent, /unavailable/i);
  assert.equal(status.hidden, false);
  poster.dispatchEvent(new window.Event('error'));
  assert.match(status.textContent, /unavailable/i);
  assert.ok(Number(window.getComputedStyle(status).zIndex) > Number(window.getComputedStyle(poster).zIndex));
});

test('single-video projects still observe visibility for playback', async t => {
  const { document, observers } = await setup(t, [{ title: 'One video', slides: [video] }]);
  const hero = document.querySelector('.hero');
  assert.ok(observers.some(observer => observer.targets.includes(hero)), 'single-video playback needs the same visibility observer as multi-slide video');
});

test('autoplay rejection retains the retry button until video actually plays', async t => {
  const { document, window } = await setup(t, [{ title: 'Autoplay blocked', slides: [video] }]);
  const hero = document.querySelector('.hero');
  const media = hero.querySelector('video.is-active');
  const play = hero.querySelector('.hero__play');
  media.play = async () => { throw new Error('Autoplay blocked'); };
  play.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(play.hidden, false);
  media.dispatchEvent(new window.Event('loadeddata'));
  assert.equal(play.hidden, false, 'decoded data is not evidence of playback');
  media.dispatchEvent(new window.Event('playing'));
  assert.equal(play.hidden, true);
});

test('intentional playback cancellation does not expose an autoplay error', async t => {
  const { document } = await setup(t, [{ title: 'Paused offscreen', slides: [video] }]);
  const hero = document.querySelector('.hero');
  const media = hero.querySelector('video.is-active');
  const play = hero.querySelector('.hero__play');
  media.play = async () => { const error = new Error('Paused'); error.name = 'AbortError'; throw error; };
  play.click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(play.hidden, true);
  assert.doesNotMatch(hero.querySelector('.hero__status').textContent, /Tap Play/);
});

test('autoplay retry paints above active previous and next hit controls', async t => {
  const { document, window } = await setup(t, [{ title: 'Retry', slides: [video, image] }]);
  document.head.innerHTML = `<style>${await readFile(new URL('../../style.css', import.meta.url), 'utf8')}</style>`;
  const hero = document.querySelector('.hero');
  hero.classList.add('is-active');
  const play = hero.querySelector('.hero__play');
  play.hidden = false;
  const retryZ = Number(window.getComputedStyle(play).zIndex);
  for (const hit of hero.querySelectorAll('.hero__hit')) {
    assert.ok(retryZ > Number(window.getComputedStyle(hit).zIndex), 'retry must receive the tap instead of advancing the slideshow');
  }
});

test('video changes retain the current frame until the incoming video plays', async t => {
  const second = video.replace('opening', 'second');
  const { document, window } = await setup(t, [{ title: 'Video transitions', slides: [video, second] }]);
  document.head.innerHTML = `<style>${await readFile(new URL('../../style.css', import.meta.url), 'utf8')}</style>`;
  const hero = document.querySelector('.hero');
  const outgoing = hero.querySelector('video.is-active');
  outgoing.dispatchEvent(new window.Event('playing'));
  const poster = hero.querySelector('.hero__poster');
  const posterSource = poster.getAttribute('src');
  hero.querySelector('.hero__hit--next').click();
  assert.equal(hero.querySelector('video.is-active'), outgoing, 'a loading video cannot replace the visible frame');
  assert.equal(poster.hidden, true, 'slide changes must not flash a poster between videos');
  assert.equal(poster.getAttribute('src'), posterSource, 'the first poster is not repurposed for every transition');
  assert.equal(hero.querySelector('.hero__status').hidden, true, 'loading text must not cover project media');
  const incoming = [...hero.querySelectorAll('video')].find(media => media.getAttribute('src') === second);
  assert.ok(incoming);
  incoming.dispatchEvent(new window.Event('playing'));
  assert.equal(hero.querySelector('video.is-active'), incoming);
  assert.equal(incoming.classList.contains('is-hidden'), false, 'ready media switches immediately without a blank animation frame');
  assert.equal(hero.classList.contains('is-transitioning'), false);
  assert.equal(window.getComputedStyle(incoming).transition, 'none');
});

test('deferred projects do not show loading text', async t => {
  const { document } = await setup(t, [{ title: 'First', slides: [video] }, { title: 'Later', slides: [image] }]);
  for (const status of document.querySelectorAll('.hero__status')) assert.equal(status.hidden, true);
});

test('rapid next clicks never overwrite the still-visible image source', async t => {
  const { document } = await setup(t, [{ title: 'Rapid clicks', slides: [image, image.replace('image.jpg', 'second.jpg'), image.replace('image.jpg', 'third.jpg')] }]);
  const hero = document.querySelector('.hero');
  const visible = hero.querySelector('img.is-active');
  const originalSrc = visible.src;
  hero.querySelector('.hero__hit--next').click();
  hero.querySelector('.hero__hit--next').click();
  assert.equal(visible.src, originalSrc, 'the visible slot stays intact while the newest requested slide loads');
});

test('late outgoing readiness cannot clear a failed incoming slide', async t => {
  const second = image.replace('image.jpg', 'second.jpg');
  const { document, window } = await setup(t, [{ title: 'Late image', slides: [image, second] }]);
  const hero = document.querySelector('.hero');
  const outgoing = hero.querySelector('img.is-active');
  hero.querySelector('.hero__hit--next').click();
  const incoming = [...hero.querySelectorAll('.hero__img')].find(media => media !== outgoing);
  incoming.dispatchEvent(new window.Event('error'));
  outgoing.dispatchEvent(new window.Event('load'));
  assert.equal(hero.querySelector('.hero__status').hidden, false);
  assert.match(hero.querySelector('.hero__status').textContent, /unavailable/i);
});

test('closed mobile Information overrides the CMS three-column display layout', async t => {
  const css = await readFile(new URL('../../style.css', import.meta.url), 'utf8');
  for (const closed of [false, true]) {
    const window = new Window({ width: 390, height: 844 });
    t.after(() => window.happyDOM.abort());
    const { document } = window;
    document.head.innerHTML = `<style>${css}</style>`;
    document.documentElement.classList.toggle('is-information-closed', closed);
    document.documentElement.dataset.homeInitialSection = 'work';
    document.documentElement.dataset.homeInformation = 'three-columns';
    document.body.dataset.page = 'home';
    document.body.innerHTML = '<section class="home-information"></section><div class="home-stage"><header class="top"></header></div>';
    assert.equal(window.getComputedStyle(document.querySelector('.home-information')).display, closed ? 'none' : 'flex');
  }
});
