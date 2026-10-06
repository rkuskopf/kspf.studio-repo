import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { Window } from 'happy-dom';

test('homepage permits free scrolling without native snapping even without JavaScript', async () => {
  const browser = new Window({url:'https://localhost/'});
  const document = browser.document;
  document.body.dataset.page='home';
  document.head.innerHTML='<style>'+await readFile(new URL('../../style.css',import.meta.url),'utf8')+'</style>';
  const style=browser.getComputedStyle(document.documentElement);
  assert.equal(style.scrollSnapType,'none');
  assert.equal(style.scrollBehavior,'auto','native input must not acquire a second CSS animation');
  await browser.happyDOM.abort();
});

test('real Lenis permits arbitrary offsets and rapid input without project snapping', async (t) => {
  const browser = new Window({ url: 'https://localhost:8001/' });
  const document = browser.document;
  document.body.innerHTML = '<section id="information"></section><div id="work"><div id="projects">' +
    '<section class="project-block"></section>'.repeat(5) + '</div></div>';
  let time = 0, sequence = 0;
  const frames = new Map(), timers = new Map();
  const media = new Map();
  const matchMedia = (query) => {
    if (!media.has(query)) {
      const result = new browser.EventTarget();
      result.matches = !query.includes('reduced-motion');
      media.set(query, result);
    }
    return media.get(query);
  };
  browser.matchMedia = matchMedia;
  Object.defineProperty(browser, 'innerHeight', { value: 720 });
  Object.defineProperty(browser, 'innerWidth', { value: 1280 });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: 3180 });
  Object.defineProperty(document.documentElement, 'clientHeight', { value: 720 });
  let y = 300;
  Object.defineProperty(browser, 'scrollY', { get: () => y });
  browser.scrollTo = (options, top) => {
    y = typeof options === 'object' ? options.top : top;
    document.documentElement.scrollTop = y;
  };
  document.documentElement.scrollTop = y;
  document.getElementById('information').getBoundingClientRect = () => ({ top: -y, height: 300 });
  const work = document.getElementById('work');
  work.getBoundingClientRect = () => ({ top: 300-y, height: 2880 });
  [...document.querySelectorAll('.project-block')].forEach((row,i) => {
    row.getBoundingClientRect = () => ({ top: 424+i*540-y, height: 472 });
  });
  const globals = {
    window: browser, Window, document, navigator: browser.navigator, HTMLElement: browser.HTMLElement,
    ResizeObserver: browser.ResizeObserver, MutationObserver: browser.MutationObserver,
    CustomEvent: browser.CustomEvent, Event: browser.Event, innerHeight: 720,
    matchMedia, performance: { now: () => time }, getComputedStyle: browser.getComputedStyle.bind(browser),
    requestAnimationFrame: (fn) => { frames.set(++sequence, fn); return sequence; },
    cancelAnimationFrame: (id) => frames.delete(id),
    setTimeout: (fn, ms) => { timers.set(++sequence, { fn, due: time+ms }); return sequence; },
    clearTimeout: (id) => timers.delete(id),
  };
  const previous = new Map(Object.keys(globals).concat('scrollY').map(key => [key, Object.getOwnPropertyDescriptor(globalThis,key)]));
  for (const [key,value] of Object.entries(globals)) Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  Object.defineProperty(globalThis,'scrollY',{get:()=>y,configurable:true});
  t.after(async () => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    reduced.matches = true;
    reduced.dispatchEvent(new browser.Event('change'));
    await browser.happyDOM.abort();
    for (const [key,descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor);
      else delete globalThis[key];
    }
  });
  const advance = (ms) => {
    const until = time+ms;
    while(time < until) {
      time += Math.min(16, until-time);
      for (const [id,timer] of [...timers]) if(timer.due<=time) { timers.delete(id); timer.fn(); }
      const callbacks = [...frames.values()]; frames.clear();
      for(const fn of callbacks) fn(time);
    }
  };
  const wheel = (delta) => {
    const event = new browser.WheelEvent('wheel',{deltaY:delta,cancelable:true,bubbles:true});
    browser.dispatchEvent(event);
    return event.defaultPrevented;
  };
  try { await import(`../../home-scroll.js?test=${Date.now()}`); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
  assert.ok(browser.kspfHomeScroll, 'desktop free-scroll controller must be loaded');
  assert.ok(document.documentElement.classList.contains('has-home-scroll'));
  advance(32);
  assert.ok(wheel(400), 'desktop input is smoothed');
  assert.equal(y,300,'no synchronous native jump');
  advance(16);
  assert.ok(y>300 && y<640,'movement glides towards the requested offset');
  advance(1000);
  assert.ok(Math.abs(y-640)<1,'wheel settles at its freely chosen offset, between project centres');
  wheel(100);advance(16);const beforeRepeat=y;
  wheel(100);advance(16);
  assert.ok(y>beforeRepeat,'rapid repeat input remains available during the glide');
  advance(1000);
  assert.ok(Math.abs(y-810)<1,'both inputs contribute without a gesture gate');
  wheel(1800);advance(2000);
  assert.ok(Math.abs(y-2340)<1,`strong input can freely cross several project rows (actual ${y})`);
  browser.kspfHomeScroll.navigate(work,false,()=>{});
  wheel(400);advance(48);const beforeReverse=y;
  wheel(-400);advance(16);
  assert.ok(y<beforeReverse,'reversal responds on the next frame');
  advance(1000);assert.ok(Math.abs(y-300)<1);
  browser.kspfHomeMinimumScroll = () => 300;
  assert.ok(wheel(-800), 'upward input at the boundary must be consumed before native scrolling');advance(1000);
  assert.ok(Math.abs(y-300)<1, 'upward wheel input stops at Work without entering Information');
  for (let i=0; i<20; i++) {
    assert.ok(wheel(-1000), 'continued strong upward packets cannot escape into native scrolling');
    advance(16);
  }
  wheel(100);advance(1000);
  assert.ok(Math.abs(y-385)<1, 'downward free scrolling remains responsive at the boundary');
  wheel(-800);advance(1000);
  assert.ok(Math.abs(y-300)<1, 'a strong upward gesture from projects ends at Work');
  browser.scrollTo(0, 0);
  browser.kspfHomeScroll.setPosition(300);
  assert.equal(y, 300, 'native input is corrected even when Lenis already targets the Work boundary');
  browser.kspfHomeMinimumScroll = () => 0;
  let finished=false;
  browser.kspfHomeScroll.navigate(document.getElementById('information'),true,()=>{finished=true;});
  advance(1000);assert.ok(Math.abs(y)<1);assert.ok(finished,'navigation completes');
  browser.kspfHomeScroll.navigate(work,true,()=>{});advance(160);
  const navigatingPosition=y;
  wheel(-100);advance(32);
  assert.ok(y<navigatingPosition,'wheel input can interrupt navigation without a lock');
  advance(1000);
  browser.kspfHomeScroll.navigate(work,true,()=>{});advance(160);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  reduced.matches=true;reduced.dispatchEvent(new browser.Event('change'));
  assert.equal(y,300,'reduced motion finishes navigation directly');
  assert.equal(wheel(40),false,'reduced motion uses native input');
  assert.equal(document.documentElement.classList.contains('has-home-scroll'),false);
  reduced.matches=false;reduced.dispatchEvent(new browser.Event('change'));
  wheel(400);advance(32);
  browser.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'ArrowDown'}));
  const stopped=y;advance(1000);assert.equal(y,stopped,'keyboard cancels pending wheel animation');
  const desktop=matchMedia('(min-width: 858px) and (hover: hover) and (pointer: fine)');
  desktop.matches=false;desktop.dispatchEvent(new browser.Event('change'));
  assert.equal(wheel(40),false,'mobile uses native input');
});
