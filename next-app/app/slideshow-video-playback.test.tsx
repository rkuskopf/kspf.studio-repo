// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import HomepageSlideshow from './homepage-slideshow';

const observers: Observer[] = [];
class Observer {
  targets: Element[] = [];
  constructor(public callback: (entries: any[]) => void, public options: IntersectionObserverInit) { observers.push(this); }
  observe(target: Element) { this.targets.push(target); }
  disconnect() {}
  visible(target: Element, visible: boolean) { this.callback([{ target, isIntersecting: visible, intersectionRatio: visible ? 1 : 0 }]); }
}
function mediaSetup() {
  observers.length = 0;
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true });
  });
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(1);
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} } as any);
}
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each([1, 3])('static slideshow with %i slides restarts after viewport re-entry', (length) => {
  mediaSetup();
  vi.useFakeTimers();
  const sources = ['/first.mp4', '/image.jpg', '/second.mp4'].slice(0, length);
  document.body.innerHTML = `<figure class="js-slideshow" data-slides='${JSON.stringify(sources)}'><img class="hero__img"><video class="hero__video" muted loop></video><button class="hero__hit--prev"></button><button class="hero__hit--next"></button></figure>`;
  const hero = document.querySelector('figure')!;
  hero.getBoundingClientRect = () => ({ top: 10, bottom: 310, left: 0, right: 400, width: 400, height: 300 } as DOMRect);
  vm.runInNewContext(readFileSync('slideshow.js', 'utf8'), { document, window, Image: window.Image, IntersectionObserver: Observer });
  const observer = observers.find(o => o.targets.includes(hero));
  expect(observer, 'single-slide videos must observe visibility too').toBeDefined();
  observer!.visible(hero, true);
  vi.advanceTimersByTime(20);
  let video = hero.querySelector('video.is-active') as HTMLVideoElement;
  expect(video.paused).toBe(false);
  video.currentTime = 12;
  observer!.visible(hero, false);
  expect(video.paused).toBe(true);
  observer!.visible(hero, true);
  expect(video.currentTime).toBe(0);
  video.currentTime = 4;
  observer!.visible(hero, true);
  expect(video.currentTime).toBe(4); // Repeated visibility updates must not interrupt playback.
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(video.paused).toBe(true);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  document.dispatchEvent(new Event('visibilitychange'));
  expect(video.currentTime).toBe(0);
  expect(video.paused).toBe(false);
  if (length > 1) {
    video.currentTime = 9;
    (hero.querySelector('.hero__hit--next') as HTMLButtonElement).click();
    expect([...hero.querySelectorAll('video')].every(v => v.paused)).toBe(true);
    (hero.querySelector('.hero__hit--prev') as HTMLButtonElement).click();
    video = hero.querySelector('video.is-active') as HTMLVideoElement;
    expect(video.currentTime).toBe(0);
    expect(video.paused).toBe(false);
    // Rapid video/image/video changes must leave just the current video playing.
    for (let i = 0; i < 5; i++) (hero.querySelector('.hero__hit--next') as HTMLButtonElement).click();
    vi.advanceTimersByTime(450);
    expect([...hero.querySelectorAll('video')].filter(v => !v.paused)).toEqual([hero.querySelector('video.is-active')]);
  }
});

it('Next.js restarts a visible video after viewport re-entry and pauses on navigation', async () => {
  mediaSetup();
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(HomepageSlideshow, { project: {
      storyId: 1, storyUuid: 'video', slug: 'video', title: 'Video', displayName: 'Video',
      category: '', alt: '', order: 1, slides: [{ type: 'video', url: '/first.mp4' }, { type: 'image', url: '/image.jpg' }],
    } })));
    const hero = container.querySelector('figure')!;
    const observer = observers.find(o => o.options.threshold === 0.25)!;
    await act(async () => observer.visible(hero, true));
    const video = container.querySelector('video')!;
    expect(video.paused).toBe(false);
    video.currentTime = 12;
    await act(async () => observer.visible(hero, false));
    expect(video.paused).toBe(true);
    await act(async () => observer.visible(hero, true));
    expect(video.currentTime).toBe(0);
    await act(async () => (container.querySelector('.homepage-hero__hit--next') as HTMLButtonElement).click());
    expect(video.paused).toBe(true);
  } finally { await act(async () => root.unmount()); }
});

it.each([false, true])('Next.js handles tab visibility and reduced motion (%s)', async (reduced) => {
  mediaSetup();
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reduced, addEventListener() {}, removeEventListener() {} } as any);
  const container = document.createElement('div'); document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(createElement(HomepageSlideshow, { project: {
      storyId: 1, storyUuid: 'video', slug: 'video', title: 'Video', displayName: 'Video',
      category: '', alt: '', order: 1, slides: [{ type: 'video', url: '/first.mp4' }, { type: 'video', url: '/first.mp4' }],
    } })));
    const hero = container.querySelector('figure')!;
    const observer = observers.find(o => o.options.threshold === 0.25)!;
    await act(async () => observer.visible(hero, true));
    const video = container.querySelector('video')!;
    expect(video.paused).toBe(reduced);
    expect(video.loop).toBe(!reduced);
    expect(video.muted).toBe(true);
    if (!reduced) {
      video.currentTime = 8;
      await act(async () => (container.querySelector('.homepage-hero__hit--next') as HTMLButtonElement).click());
      expect(video.currentTime).toBe(0);
      video.currentTime = 9;
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      await act(async () => document.dispatchEvent(new Event('visibilitychange')));
      expect(video.paused).toBe(true);
      vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
      await act(async () => document.dispatchEvent(new Event('visibilitychange')));
      expect(video.currentTime).toBe(0);
      expect(video.paused).toBe(false);
    }
  } finally { await act(async () => root.unmount()); }
});
