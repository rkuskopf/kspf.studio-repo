import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { Window } from 'happy-dom';

async function setup(t, desktop = false) {
  const browser = new Window({ url: 'https://localhost:8001/#work' });
  t.after(() => browser.happyDOM.abort());
  const document = browser.document;
  document.body.innerHTML = '<a href="#work" data-info-scroll="work">KSPF</a>' +
    '<a href="#information" data-info-scroll="information">INFO</a>' +
    '<section id="information" tabindex="-1"></section><section id="work" tabindex="-1"></section>';
  let y = 600;
  Object.defineProperty(browser, 'scrollY', { get: () => y });
  browser.scrollTo = (_x, top) => { y = top; };
  browser.matchMedia = () => ({ matches: !desktop });
  document.getElementById('information').getBoundingClientRect = () => ({ top: -y });
  document.getElementById('work').getBoundingClientRect = () => ({ top: 600-y });
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
    browser, document,
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
