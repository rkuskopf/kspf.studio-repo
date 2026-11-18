import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Window } from 'happy-dom';
import { mapHomeStory, mapSiteStory } from '../storyblok-content.mjs';

test('static navigation follows the saved block choice and preserves the legacy default', () => {
  const map = content => mapHomeStory({content:{component:'home_page',...content}});
  assert.equal(map({}).navigationLayout,'classic');
  assert.equal(map({body:[{component:'navigation'}]}).navigationLayout,'classic');
  assert.equal(map({body:[{component:'navigation_new'}]}).navigationLayout,'new');
  assert.throws(()=>map({body:[{component:'navigation'},{component:'navigation_new'}]}), /navigation/i);
});

test('enquiry mapping defaults off and resolves a configured destination', () => {
  const map = nav => mapSiteStory({content:{component:'site_settings', nav:[nav]}}).nav;
  assert.equal(map({}).showEnquire, false);
  assert.equal(map({show_enquire:'true'}).showEnquire, false);
  assert.equal(map({show_enquire:true}).showEnquire, true);
  assert.equal(map({enquire_href:{linktype:'url', url:'/enquire'}}).enquireHref, '/enquire');
});

for (const [showEnquire, enquireHref, visible] of [
  [undefined, '/enquire', false], [false, '/enquire', false],
  [true, '', false], [true, '/enquire', true],
]) {
  test(`enquiry prerender and hydration agree: toggle=${showEnquire}, destination=${enquireHref}`, async t => {
    const dir = await mkdtemp(join(tmpdir(), 'kspf-enquiry-'));
    t.after(() => rm(dir, {recursive:true,force:true}));
    const browser = new Window();
    t.after(() => browser.happyDOM.abort());
    await mkdir(join(dir, 'content'));
    await writeFile(join(dir, 'index.html'), await readFile(new URL('../../index.html', import.meta.url)));
    await writeFile(join(dir, 'content/home.json'), JSON.stringify({navigationLayout:'new'}));
    const site = {nav:{homeLabel:'KSPF', informationLabel:'INFO', informationHref:'#info', showAbout:true, showEnquire, enquireHref}};
    await writeFile(join(dir, 'content/site.json'), JSON.stringify(site));
    const render = () => execFileSync(process.execPath, [new URL('../prerender.mjs', import.meta.url).pathname, dir]);
    render();
    const html = await readFile(join(dir, 'index.html'), 'utf8');
    render();
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), html);
    browser.document.write(html);
    assert.equal(browser.document.documentElement.dataset.homeNavigation, 'new');
    vm.runInNewContext(await readFile(new URL('../../home-content.js', import.meta.url), 'utf8'), {
      document:browser.document, window:browser, console,
      fetch:async()=>({ok:true,json:async()=>({navigationLayout:'classic'})}),
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(browser.document.documentElement.dataset.homeNavigation, 'classic');
    const link = browser.document.querySelector('.nav__link--enquire');
    assert.ok(link, 'source includes an enquiry link');
    assert.equal(link.hidden, !visible);
    assert.equal(link.getAttribute('href'), visible ? enquireHref : null);
    assert.equal(link.textContent, 'ENQUIRE');
    const info = browser.document.querySelector('.nav__link--information');
    assert.equal(info.hidden, false);
    assert.equal(info.getAttribute('href'), '#information', 'keep the static INFO scroll target');
    // Hydration must also clear a stale visible destination after editors disable it.
    link.hidden = false;
    link.setAttribute('href', '/stale');
    vm.runInNewContext(await readFile(new URL('../../site-content.js', import.meta.url), 'utf8'), {
      document:browser.document, window:browser, console,
      fetch:async()=>({ok:true,json:async()=>site}),
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(link.hidden, !visible);
    assert.equal(link.getAttribute('href'), visible ? enquireHref : null);
    assert.equal(info.getAttribute('href'), '#information');
  });
}
