import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { Window } from 'happy-dom';
import { mapHomeStory } from '../storyblok-content.mjs';

for (const populated of [true, false]) {
  test(`initial HTML includes CMS Information and navigation state (${populated ? 'populated' : 'empty'})`, async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'kspf-initial-content-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    await mkdir(join(dir, 'content'));
    await writeFile(join(dir, 'index.html'), await readFile(new URL('../../index.html', import.meta.url)));
    const info = {
      contactTitle: 'CONTACT', contactBody: populated ? 'First <line>\nSecond & line' : '',
      contactEmail: populated ? 'mailto:studio@kspf.au' : '', servicesTitle: 'SERVICES',
      services: populated ? ['Web Development', 'Art & Direction', '', 'Product Design'] : [],
    };
    const home = mapHomeStory({ full_slug: 'home', content: {
      component: 'home_page',
      initial_section: populated ? 'info' : 'work',
      show_navigation: !populated,
      body: [{ component: populated ? 'information_three_columns' : 'information' }],
    } });
    await writeFile(join(dir, 'content/home.json'), JSON.stringify(home));
    const site = {nav: {homeLabel:'KSPF'}, profile:'CMS profile', informationOverlay:info};
    await writeFile(join(dir, 'content/site.json'), JSON.stringify(site));
    const prerender = () => execFileSync(process.execPath, [new URL('../prerender.mjs', import.meta.url).pathname, dir]);
    prerender();
    const html = await readFile(join(dir, 'index.html'), 'utf8');
    prerender();
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), html, 'repeated deployment preparation is stable');
    const browser = new Window();
    t.after(() => browser.happyDOM.abort());
    browser.document.write(html);
    const doc = browser.document;
    assert.equal(doc.documentElement.dataset.homeInitialSection, populated ? 'info' : 'work');
    assert.equal(doc.querySelector('.top').hidden, populated);
    const layout = populated ? 'three-columns' : 'classic';
    assert.equal(doc.documentElement.dataset.homeInformation, layout);
    delete doc.documentElement.dataset.homeInformation;
    vm.runInNewContext(await readFile(new URL('../../home-content.js', import.meta.url), 'utf8'), {
      document: doc, window: browser, fetch: async () => ({ ok: true, json: async () => home }),
    });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(doc.documentElement.dataset.homeInformation, layout);
    assert.equal(doc.querySelector('.js-home-information-title').textContent, 'KSPF');
    assert.equal(doc.querySelector('.js-info-contact-title').textContent, 'CONTACT');
    assert.equal(doc.querySelector('.js-info-services-title').textContent, 'SERVICES');
    assert.deepEqual([...doc.querySelectorAll('.js-info-services-list li')].map(e=>e.textContent), info.services.filter(Boolean));
    const body = doc.querySelector('.js-info-contact-body');
    assert.equal(body.hidden, !populated);
    assert.equal(body.querySelector('line'), null, 'contact text is escaped');
    assert.equal(body.querySelectorAll('br').length, populated ? 1 : 0);
    const email = doc.querySelector('.js-info-contact-email');
    assert.equal(email.hidden, !populated);
    assert.equal(email.textContent, populated ? 'studio@kspf.au' : '');
    assert.equal(email.getAttribute('href'), populated ? 'mailto:studio@kspf.au' : null);
    const before = doc.querySelector('.home-information').innerHTML;
    vm.runInNewContext(await readFile(new URL('../../site-content.js', import.meta.url), 'utf8'), {
      document:doc, window:browser, console,
      fetch:async()=>({ok:true,json:async()=>site}),
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(doc.querySelector('.home-information').innerHTML, before, 'hydration keeps the initial Information content identical');
  });
}
