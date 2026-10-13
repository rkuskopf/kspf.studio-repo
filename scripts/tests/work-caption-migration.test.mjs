import test from 'node:test';
import assert from 'node:assert/strict';
import { HOMEPAGE_COMPONENTS } from '../storyblok-homepage-schema.mjs';
import { WORK_POSITION_FIELDS } from '../work-caption-positions.mjs';
import { STORYBLOK_COMPONENTS } from '../storyblok-schema.mjs';
import { runWorkCaptionMigration } from '../work-caption-migration.mjs';
import { runHomepageMigration, homepageBaselineBody } from '../storyblok-homepage-migration.mjs';

const fixture = () => {
  const work = {...structuredClone(HOMEPAGE_COMPONENTS.find(c => c.name === 'project_feed')), id: 3};
  for (const key of Object.keys(WORK_POSITION_FIELDS)) delete work.schema[key];
  work.schema.unrelated = {type:'text'};
  const home = {id:42, uuid:'home', full_slug:'home', content:{component:'home_page', caption_layout:'flipped', body:[
    {_uid:'info',component:'information',site:'site'},
    {_uid:'nav',component:'navigation',site:'site'},
    {_uid:'work',component:'project_feed',collection:'projects/'},
  ], title__i18n__fr:'Bonjour'}};
  const writes=[];
  const api = {
    listComponents: async () => [structuredClone(work)],
    findStoriesByFullSlug: async () => [structuredClone(home)],
    getStory: async () => structuredClone(home),
    updateComponent: async (id, component) => { assert.equal(id,3); writes.push('schema'); Object.assign(work,structuredClone(component)); },
    updateStory: async (id, story) => { assert.equal(id,42); writes.push('draft'); home.content=structuredClone(story.content); },
  };
  return {api,work,home,writes,backup:async snapshot => {writes.push('backup');assert.equal(snapshot.home.id,42);}};
};
test('Work exposes all four shared dropdowns and project stories have no placement overrides',()=>{
  const work=HOMEPAGE_COMPONENTS.find(c=>c.name==='project_feed');
  for(const field of ['title_position','category_position','caption_position','number_position']) {
    assert.equal(work.schema[field].type,'option');
    assert.deepEqual(work.schema[field].options.map(option=>option.value),['left','right','bottom-left','bottom-right','hidden']);
    assert.equal(STORYBLOK_COMPONENTS.find(c=>c.name==='project').schema[field],undefined);
  }
});
for (const [layout, expected] of [
  ['current', {number:'left',title:'bottom-left',category:'right',caption:'bottom-right'}],
  ['below', {number:'left',title:'bottom-left',category:'bottom-right',caption:'bottom-right'}],
  ['below-flipped', {number:'left',title:'bottom-right',category:'bottom-left',caption:'bottom-right'}],
]) test(`preserves the ${layout} preset in the draft transfer`,async()=>{
  const f=fixture();f.home.content.caption_layout=layout;
  assert.deepEqual((await runWorkCaptionMigration(f)).positions,expected);
});
test('plan adds four shared controls and transfers the legacy preset without writes',async()=>{
  const f=fixture();const result=await runWorkCaptionMigration(f);
  assert.equal(result.actions.length,2);assert.deepEqual(f.writes,[]);
  assert.deepEqual(result.positions,{number:'right',title:'bottom-left',category:'left',caption:'bottom-right'});
});
test('apply backs up before additive writes, preserves content/settings, and is idempotent',async()=>{
  const f=fixture();f.home.content.body[2].title_position='right';
  await runWorkCaptionMigration({...f,mode:'apply'});
  assert.deepEqual(f.writes,['backup','schema','draft']);
  assert.equal(f.home.content.body[2].title_position,'right');
  assert.equal(f.home.content.body[2].number_position,'right');
  assert.equal(f.home.content.title__i18n__fr,'Bonjour');
  assert.equal(f.home.content.caption_layout,'flipped');
  assert.deepEqual(f.work.schema.unrelated,{type:'text'});
  const count=f.writes.length;
  assert.equal((await runWorkCaptionMigration({...f,mode:'apply'})).actions.length,0);
  assert.equal(f.writes.length,count);
});
test('refuses conflicting schema and conflicting editorial edits before writes',async()=>{
  const f=fixture();f.work.schema.title_position={type:'text'};
  await assert.rejects(runWorkCaptionMigration({...f,mode:'apply'}),/conflict/i);
  assert.deepEqual(f.writes,[]);
  const g=fixture();const get=g.api.getStory;let reads=0;
  g.api.getStory=async()=>{if(++reads===2)g.home.content.title='Edited';return get();};
  await assert.rejects(runWorkCaptionMigration({...g,mode:'apply'}),/changed/i);
  assert.deepEqual(g.writes,[]);
});
test('refuses draft overwrite after a schema write and requires a successful backup',async()=>{
  const f=fixture();const update=f.api.updateComponent;
  f.api.updateComponent=async(...args)=>{await update(...args);f.home.content.title='New edit';};
  await assert.rejects(runWorkCaptionMigration({...f,mode:'apply'}),/changed/i);
  assert.equal(f.home.content.title,'New edit');assert.ok(!f.writes.includes('draft'));
  for(const backup of [undefined,async()=>{throw Error('disk full');}]) {
    const g=fixture();await assert.rejects(runWorkCaptionMigration({...g,mode:'apply',backup}));assert.deepEqual(g.writes,[]);
  }
});
test('composition migration accepts additive Work controls and saved positions on rerun',async()=>{
  const components=structuredClone(HOMEPAGE_COMPONENTS).map((c,i)=>({...c,id:i+2}));
  const {HOMEPAGE_BODY_FIELD}=await import('../storyblok-homepage-schema.mjs');
  components.push({id:1,name:'home_page',schema:{body:HOMEPAGE_BODY_FIELD}});
  const home={id:42,uuid:'home',full_slug:'home',content:{component:'home_page',body:homepageBaselineBody('home','site')}};
  home.content.body[2].title_position='left';
  const site={id:7,uuid:'site',full_slug:'site',content:{component:'site_settings'}};
  const result=await runHomepageMigration({api:{listComponents:async()=>components,findStoriesByFullSlug:async slug=>[slug==='home'?home:site],getStory:async id=>id===42?home:site}});
  assert.deepEqual(result.actions,[]);
});

test('adds Hidden to prior position schemas without changing explicit Home settings', async () => {
  const f = fixture();
  for (const [key, field] of Object.entries(WORK_POSITION_FIELDS)) {
    f.work.schema[key] = {...structuredClone(field), options: field.options.filter(option => option.value !== 'hidden')};
    f.home.content.body[2][key] = 'hidden';
  }
  const before = structuredClone(f.home.content);
  const plan = await runWorkCaptionMigration(f);
  assert.equal(plan.actions[0].kind, 'add-work-hidden-options');
  assert.deepEqual(f.writes, []);
  await runWorkCaptionMigration({...f, mode: 'apply'});
  assert.deepEqual(f.writes, ['backup', 'schema']);
  assert.deepEqual(f.home.content, before);
  assert.equal((await runWorkCaptionMigration(f)).actions.length, 0);
});
