import assert from 'node:assert/strict';
import test from 'node:test';
import { createGestureLimiter, transitionCurve } from '../../home-scroll-gesture.js';
import { Window } from 'happy-dom';

const points = [0, 540, 1080, 1620];
test('tiny intentional input commits immediately; noise produces no partial movement', () => {
  const gesture = createGestureLimiter();
  assert.equal(gesture.input(0.2, 540, 540, points, 0), undefined);
  assert.equal(gesture.input(2, 540, 540, points, 16), 1080);
  assert.equal(gesture.input(4000, 600, 1080, points, 32), undefined);
});
test('landing releases immediately; a renewed pulse is accepted during the old momentum tail', () => {
  const gesture = createGestureLimiter();
  gesture.input(40, 540, 540, points, 0);
  gesture.input(30, 600, 1080, points, 16);
  gesture.input(20, 850, 1080, points, 32);
  gesture.land();
  assert.equal(gesture.input(15, 1080, 1080, points, 48), undefined);
  assert.equal(gesture.input(40, 1080, 1080, points, 64), 1620);
});
test('a new tiny gesture after landing has no cooldown', () => {
  const gesture = createGestureLimiter();
  gesture.input(40, 540, 540, points, 0);
  gesture.land();
  assert.equal(gesture.input(2, 1080, 1080, points, 16), 1620);
});
test('sustained drag/momentum does not initiate another project on landing', () => {
  const gesture = createGestureLimiter();
  assert.equal(gesture.input(12, 540, 540, points, 0), 1080);
  for(let t=16;t<320;t+=16) assert.equal(gesture.input(12, 600, 1080, points, t),undefined);
  gesture.land();
  for(let t=320;t<900;t+=16) assert.equal(gesture.input(12,1080,1080,points,t),undefined);
});
test('reversal retargets immediately without waiting for landing', () => {
  const gesture = createGestureLimiter();
  gesture.input(40, 540, 540, points, 0);
  assert.equal(gesture.input(-2, 600, 1080, points, 16), 540);
});
test('settling starts with the existing velocity and ends with zero velocity', () => {
  const { duration, easing } = transitionCurve(400, 180);
  const dt = 0.00001;
  assert.equal(easing(0), 0);
  assert.equal(easing(1), 1);
  assert.ok(Math.abs((easing(dt) / dt) * 400 / duration - 180) < 0.1);
  assert.ok(Math.abs((1 - easing(1-dt)) / dt) < 0.001);
  for (let i = 1; i <= 100; i++) assert.ok(easing(i/100) >= easing((i-1)/100));
});

test('real Lenis: damped first frame, flick, slow drag, momentum, reversal and native fallbacks', async (t) => {
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
  await import(`../../home-scroll.js?test=${Date.now()}`);
  assert.ok(document.documentElement.classList.contains('has-home-scroll'));
  advance(32);
  assert.ok(wheel(40), 'first wheel must be prevented before native scrolling');
  assert.equal(y,300,'no synchronous native jump');
  advance(16);
  assert.ok(y>300 && y<307,'the single transition starts gently on its first frame');
  const normalFirstFrame = y;
  advance(1000);
  assert.ok(Math.abs(y-840)<1,'light flick settles at adjacent project');
  browser.kspfHomeScroll.navigate(work,false,()=>{});
  wheel(2);advance(16);
  assert.ok(Math.abs(y-normalFirstFrame)<0.001,'tiny gesture uses the same curve as normal input');
  advance(1000);
  assert.ok(Math.abs(y-840)<1,'tiny gesture reaches the adjacent project');
  browser.kspfHomeScroll.navigate(work,false,()=>{});
  wheel(40);advance(300);
  assert.ok(Math.abs(y-840)<1);
  wheel(2);advance(16);
  assert.ok(y>840,'next gesture begins immediately after landing');
  browser.kspfHomeScroll.navigate(work,false,()=>{});
  for(let i=0;i<40;i++){wheel(12);advance(40); assert.ok(y<=840.5);}
  advance(1000);
  assert.ok(Math.abs(y-840)<1,'slow gesture stays at adjacent project');
  browser.kspfHomeScroll.navigate(work,false,()=>{});
  for(let i=0;i<60;i++){assert.ok(wheel(800*Math.exp(-i/15)));advance(16);assert.ok(y<=840.5);}
  advance(1000);
  assert.ok(Math.abs(y-840)<1,'strong momentum cannot pass adjacent project');
  browser.kspfHomeScroll.navigate(work,false,()=>{});
  wheel(200);advance(48);
  const beforeReverse=y;
  wheel(-200);advance(16);
  assert.ok(y<beforeReverse,'reversal starts on the next animation frame');
  advance(1000);
  assert.ok(Math.abs(y-300)<1);
  browser.kspfHomeScroll.navigate(document.getElementById('information'),true,()=>{});
  advance(1000);
  assert.ok(Math.abs(y)<1,'Information navigation reaches its existing target');
  browser.kspfHomeScroll.navigate(work,true,()=>{});
  advance(160);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  reduced.matches=true; reduced.dispatchEvent(new browser.Event('change'));
  assert.equal(y,300,'changing reduced motion finishes navigation directly');
  assert.equal(document.documentElement.classList.contains('has-home-scroll'),false);
  assert.equal(wheel(40),false,'reduced motion uses native wheel input');
  reduced.matches=false; reduced.dispatchEvent(new browser.Event('change'));
  wheel(200);advance(32);
  browser.dispatchEvent(new browser.KeyboardEvent('keydown',{key:'ArrowDown'}));
  const keyboardPosition=y;
  advance(1000);
  assert.equal(y,keyboardPosition,'keyboard scrolling cancels pending wheel movement');
  const desktop = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
  desktop.matches=false; desktop.dispatchEvent(new browser.Event('change'));
  assert.equal(wheel(40),false,'mobile uses native wheel input');
});
