import assert from 'node:assert/strict';
import test from 'node:test';
import { createGestureLimiter, settleCurve } from '../../home-scroll-gesture.js';
import { Window } from 'happy-dom';

const points = [0, 540, 1080, 1620];
test('first delta is resisted, even a huge event cannot cross the adjacent project', () => {
  const gesture = createGestureLimiter();
  assert.equal(gesture.input(40, 0, 0, points, 0), 26);
  assert.equal(gesture.input(4000, 2, 26, points, 16), 120);
  for (let t = 32, target = 146; t < 160; t += 16) {
    target += gesture.input(4000, target, target, points, t);
    assert.ok(target <= 540);
  }
  assert.equal(gesture.input(4000, 540, 540, points, 200), 0);
  assert.equal(gesture.destination(), 540);
});
test('a continuous slow drag and its momentum remain within one project', () => {
  const gesture = createGestureLimiter();
  let target = 540;
  for (let t = 0; t < 2000; t += 40) {
    target += gesture.input(12, target, target, points, t);
    assert.ok(target <= 1080);
  }
  assert.equal(gesture.destination(), 1080);
});
test('reversal immediately returns toward the preceding project without lockout', () => {
  const gesture = createGestureLimiter();
  gesture.input(200, 540, 540, points, 0);
  assert.ok(gesture.input(-200, 610, 670, points, 16) < 0);
  assert.equal(gesture.destination(), 540);
});
test('a fresh gesture after settling can advance again; tiny noise stays put', () => {
  const gesture = createGestureLimiter();
  gesture.input(100, 0, 0, points, 0);
  assert.equal(gesture.destination(), 540);
  gesture.input(100, 540, 540, points, 400);
  assert.equal(gesture.destination(), 1080);
  const noise = createGestureLimiter();
  noise.input(1, 540, 540, points, 0);
  assert.equal(noise.destination(), 540);
});
test('settling starts with the existing velocity and ends with zero velocity', () => {
  const { duration, easing } = settleCurve(400, 180);
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
  assert.ok(y>300 && y<307,'first movement is below the already resisted 26px target');
  advance(1000);
  assert.ok(Math.abs(y-840)<1,'light flick settles at adjacent project');
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
