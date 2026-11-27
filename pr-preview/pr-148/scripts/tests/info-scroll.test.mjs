import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { Window } from 'happy-dom';

async function setup(t, desktop = false, mobile = false) {
  const browser = new Window({ url: 'https://localhost:8001/#work' });
  t.after(() => browser.happyDOM.abort());
  const document = browser.document;
  document.body.innerHTML = '<a href="#work" data-info-scroll="work">KSPF</a>' +
    '<a href="#information" data-info-scroll="information">INFO</a>' +
    '<section id="information" tabindex="-1"></section><section id="work" tabindex="-1"></section>';
  let y = 600;
  Object.defineProperty(browser, 'scrollY', { get: () => y });
  const calls = [];
  browser.scrollTo = (_x, top) => { calls.push(top); y = top; };
  const breakpoint = { matches: mobile, addEventListener(_name, callback) { this.callback = callback; } };
  browser.matchMedia = query => query.includes('max-width') ? breakpoint : ({ matches: !desktop });
  document.getElementById('information').getBoundingClientRect = () => ({ top: -y });
  document.getElementById('work').getBoundingClientRect = () => ({ top: (breakpoint.matches && document.documentElement.classList.contains('is-information-closed') ? 0 : 600)-y });
  if (desktop) browser.kspfHomeScroll = {
    navigate(target, _animate, complete) {
      y = target.id === 'work' ? 600 : 0;
      complete();
      return true;
    },
  };
  const source = await readFile(new URL('../../info-scroll.js', import.meta.url), 'utf8');
  vm.runInNewContext(source, {
    window: browser, document, history: browser.history, location: browser.location,
    requestAnimationFrame: (callback) => { callback(); return 1; },
    cancelAnimationFrame() {}, performance: { now: () => 0 },
  });
  return {
    browser, document, calls,
    setMobile(value) { breakpoint.matches = value; breakpoint.callback?.(); },
    info: document.querySelector('[data-info-scroll="information"]'),
    work: document.querySelector('[data-info-scroll="work"]'),
    scroll: (position) => { y = position; },
    position: () => y,
  };
}

for (const desktop of [false, true]) {
  test(`INFO returns to Work when already viewing Information (${desktop ? 'desktop' : 'native'})`, async (t) => {
    const page = await setup(t, desktop);
    page.info.click();
    assert.equal(page.position(), 0);
    assert.equal(page.browser.location.hash, '#information');
    page.scroll(120);
    page.scroll(0);
    page.info.click();
    assert.equal(page.position(), 600, 'repeat INFO returns to Work after scrolling within Information');
    assert.equal(page.browser.location.hash, '#work');
    assert.equal(page.browser.history.state.homeSection, 'work');
    assert.equal(page.document.activeElement.id, 'work');
  });
}

test('INFO uses the visible section rather than a stale hash after manual scrolling', async (t) => {
  const page = await setup(t);
  page.info.click();
  page.scroll(900);
  page.info.click();
  assert.equal(page.position(), 0, 'INFO opens Information when manually scrolled back to projects');
  page.work.click();
  assert.equal(page.position(), 600);
  page.work.click();
  assert.equal(page.position(), 600, 'KSPF remains a direct link to Work');
});

test('scrolling back to Work replaces the Information URL without adding history', async (t) => {
  const page = await setup(t);
  page.info.click();
  const entries = page.browser.history.length;
  page.scroll(400);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.browser.location.hash, '#information', 'URL stays on Information until reaching Work');
  page.scroll(600);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.browser.location.hash, '#work');
  assert.equal(page.browser.history.state.homeSection, 'work');
  assert.equal(page.browser.history.length, entries, 'passive scrolling adds no Back-button entries');
});

test('scroll events during INFO navigation do not change its intended URL', async (t) => {
  const page = await setup(t, true);
  let finish;
  page.browser.kspfHomeScroll.navigate = (_target, _animate, complete) => {
    finish = complete;
    return true;
  };
  page.scroll(900);
  page.info.click();
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.browser.location.hash, '#information', 'moving through Work on the way to Information must not rewrite the URL');
  page.scroll(0);
  finish();
  page.scroll(650);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.browser.location.hash, '#work');
});

test('native scrolling cannot enter Information until INFO opens it', async (t) => {
  const page = await setup(t);
  page.scroll(400);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 600, 'native keyboard, touch and scrollbar scrolling stop at Work');
  page.info.click();
  assert.equal(page.position(), 0, 'INFO still opens Information');
  page.scroll(120);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 120, 'Information can be scrolled after opening it');
  page.scroll(650);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  page.scroll(300);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 600, 'returning to Work closes independent Information access again');
});

test('Information remains scrollable when Storyblok makes it the starting section', async (t) => {
  const page = await setup(t);
  page.document.documentElement.dataset.homeInitialSection = 'info';
  page.info.click();
  page.scroll(650);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.browser.location.hash, '#work');
  assert.equal(page.browser.kspfHomeMinimumScroll(), 0, 'desktop wheel scrolling can return to Information');
  page.scroll(100);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 100, 'native scrolling can return to Information too');
});

test('Information remains reachable when navigation or its INFO link is hidden', async (t) => {
  const page = await setup(t);
  const navigation = page.document.createElement('header');
  navigation.className = 'top';
  page.info.before(navigation);
  navigation.append(page.info);
  navigation.hidden = true;
  assert.equal(page.browser.kspfHomeMinimumScroll(), 0);
  page.scroll(100);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 100);
  navigation.hidden = false;
  page.info.hidden = true;
  assert.equal(page.browser.kspfHomeMinimumScroll(), 0);
  page.info.hidden = false;
  assert.equal(page.browser.kspfHomeMinimumScroll(), 600, 'Work startup with visible INFO retains the boundary');
});


test('mobile Work uses native zero without correcting upward overscroll', async t => {
  const page = await setup(t, false, true);
  assert.equal(page.position(), 0);
  assert.equal(page.browser.kspfHomeMinimumScroll(), 0);
  page.calls.length = 0;
  for (const y of [-30, -10, 0]) {
    page.scroll(y);
    page.browser.dispatchEvent(new page.browser.Event('scroll'));
  }
  assert.deepEqual(page.calls, [], 'native elastic overscroll must not trigger application corrections');
});

test('mobile INFO reveal and return preserve the Work-relative position', async t => {
  const page = await setup(t, false, true);
  page.info.click();
  assert.equal(page.position(), 0);
  assert.equal(page.document.documentElement.classList.contains('is-information-closed'), false);
  page.work.click();
  assert.equal(page.position(), 0, 'closed Work is the native document top');
  assert.equal(page.document.documentElement.classList.contains('is-information-closed'), true);
  page.info.click();
  page.scroll(720);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 120, 'collapsing Information preserves 120px progress into Work');
  assert.equal(page.browser.location.hash, '#work');
  assert.equal(page.document.activeElement.id, 'work', 'closed Information must not retain keyboard focus');
});

test('mobile breakpoint changes preserve the same Work-relative position', async t => {
  const page = await setup(t, false, true);
  page.scroll(120);
  page.setMobile(false);
  assert.equal(page.position(), 720);
  page.setMobile(true);
  assert.equal(page.position(), 120);
});

test('mobile information-first and hidden navigation stay independently reachable', async t => {
  const page = await setup(t, false, true);
  page.document.documentElement.dataset.homeInitialSection = 'info';
  page.browser.dispatchEvent(new page.browser.Event('kspf:content-ready'));
  assert.equal(page.document.documentElement.classList.contains('is-information-closed'), false);
  page.scroll(100);
  page.browser.dispatchEvent(new page.browser.Event('scroll'));
  assert.equal(page.position(), 100);
});
