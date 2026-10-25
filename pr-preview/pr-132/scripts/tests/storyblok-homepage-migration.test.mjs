import test from 'node:test';
import assert from 'node:assert/strict';
import { runHomepageMigration, homepageBaselineBody } from '../storyblok-homepage-migration.mjs';
import { HOMEPAGE_COMPONENTS, HOMEPAGE_BODY_FIELD } from '../storyblok-homepage-schema.mjs';
import { STORYBLOK_COMPONENTS } from '../storyblok-schema.mjs';
import { parseHomepageMigrationFlags } from '../setup-homepage.mjs';

const fixture = () => {
  const components=[{id:1,name:'home_page',is_root:true,is_nestable:false,schema:{title:{type:'text'},caption_layout:{type:'option'}}}];
  const home={id:42,uuid:'home-uuid',full_slug:'home',name:'Home',content:{component:'home_page',title:'Portfolio',intro:'Hello',caption_layout:'flipped',intro__i18n__fr:'Bonjour',unrelated:{value:7}}};
  const site={id:7,uuid:'site-uuid',full_slug:'site',content:{component:'site_settings',profile:'Independent'}};
  const writes=[];
  const api={
    listComponents:async()=>structuredClone(components),
    findStoriesByFullSlug:async slug => [structuredClone(slug==='home'?home:site)],
    getStory:async id=>structuredClone(id===42?home:site),
    createComponent:async component=>{ writes.push('component'); components.push({...component,id:components.length+1}); },
    updateComponent:async(id,component)=>{writes.push('schema');components[0]=structuredClone(component);},
    updateStory:async(id,story)=>{writes.push('draft');home.content=structuredClone(story.content);},
    publishStory:async()=>{throw new Error('Publication forbidden');},
  };
  const backup=async snapshot=>{writes.push('backup');assert.equal(snapshot.home.content.unrelated.value,7);};
  return {api,home,site,components,writes,backup};
};
test('additive schema keeps legacy controls and restricts the core body',()=>{
  const home=STORYBLOK_COMPONENTS.find(c=>c.name==='home_page');
  assert.deepEqual(home.schema.body,HOMEPAGE_BODY_FIELD);
  for(const name of ['title','intro','initial_section','show_navigation','caption_layout','show_project_numbers','show_project_titles','show_project_categories','show_image_captions']) assert.ok(home.schema[name]);
  assert.deepEqual(HOMEPAGE_BODY_FIELD.component_whitelist,['information','navigation','project_feed']);
  assert.ok(HOMEPAGE_COMPONENTS.every(c=>c.is_nestable&&!c.is_root));
  assert.equal(HOMEPAGE_COMPONENTS[0].schema.site.source,'internal_stories');
});
test('plan reports additions and performs zero writes',async()=>{
  const f=fixture(); const result=await runHomepageMigration({api:f.api});
  assert.equal(result.actions.length,5);assert.deepEqual(f.writes,[]);
});
test('apply backs up first, retains translations and legacy fields, then is idempotent',async()=>{
  const f=fixture();const content=structuredClone(f.home.content);
  await runHomepageMigration({...f,mode:'apply'});
  assert.equal(f.writes[0],'backup');assert.equal(f.writes.at(-1),'draft');
  assert.deepEqual({...f.home.content,body:undefined},{...content,body:undefined});
  assert.equal(f.home.content.body[0].site,f.site.uuid);
  f.home.content.body.forEach((block,i)=>block._uid=`editor-owned-${i}`);
  const count=f.writes.length;
  const result=await runHomepageMigration({...f,mode:'apply'});
  assert.equal(result.actions.length,0);assert.equal(f.writes.length,count);
});
test('refuses writes without backup or if backup fails',async()=>{
  for (const backup of [undefined,async()=>{throw new Error('disk full');}]) {
    const f=fixture();await assert.rejects(runHomepageMigration({api:f.api,mode:'apply',backup}));assert.deepEqual(f.writes,[]);
  }
});
test('detects an intervening story edit before any write',async()=>{
  const f=fixture(); const get=f.api.getStory;let reads=0;
  f.api.getStory=async id=>{if(++reads===3)f.home.content.intro='Changed';return get(id);};
  await assert.rejects(runHomepageMigration({...f,mode:'apply'}),/changed since planning/);assert.deepEqual(f.writes,[]);
});
test('preserves existing different composition',async()=>{
  const f=fixture();f.home.content.body=homepageBaselineBody(f.home.uuid,f.site.uuid).reverse();
  await assert.rejects(runHomepageMigration({...f,mode:'apply'}),/preserving it/);assert.deepEqual(f.writes,[]);
});
test('rejects conflicting schema while retaining unrelated fields',async()=>{
  const f=fixture();f.components[0].schema.body={type:'text'};
  await assert.rejects(runHomepageMigration({...f,mode:'apply'}),/conflicts/);assert.deepEqual(f.writes,[]);
});
test('deterministic UIDs and CLI never permit publishing',()=>{
  assert.deepEqual(homepageBaselineBody('home','site'),homepageBaselineBody('home','site'));
  assert.equal(parseHomepageMigrationFlags([]),'plan');assert.equal(parseHomepageMigrationFlags(['--apply']),'apply');
  assert.throws(()=>parseHomepageMigrationFlags(['--publish']));assert.throws(()=>parseHomepageMigrationFlags(['--aply']));
});

test('rechecks Home after schema writes and preserves an intervening edit',async()=>{
  const f=fixture();const create=f.api.createComponent;
  f.api.createComponent=async component=>{await create(component);f.home.content.title='New editorial title';};
  await assert.rejects(runHomepageMigration({...f,mode:'apply'}),/Home changed during/);
  assert.equal(f.home.content.title,'New editorial title');assert.ok(!f.writes.includes('draft'));
});
test('accepts server-assigned schema field IDs and keeps extra component fields',async()=>{
  const f=fixture();
  f.components.push(...structuredClone(HOMEPAGE_COMPONENTS));
  f.components[1].schema.site.id='assigned-by-storyblok';
  f.components[1].schema.future_field={type:'text'};
  await runHomepageMigration({...f,mode:'apply'});
  assert.deepEqual(f.components[1].schema.future_field,{type:'text'});
});
