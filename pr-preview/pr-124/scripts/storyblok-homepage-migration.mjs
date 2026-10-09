import { createHash } from 'node:crypto';
import { isDeepStrictEqual as equal } from 'node:util';
import { HOMEPAGE_COMPONENTS, HOMEPAGE_BODY_FIELD } from './storyblok-homepage-schema.mjs';
import { WORK_POSITION_FIELDS } from './work-caption-positions.mjs';

const normalizeField = field => {
  const copy = structuredClone(field); delete copy.id; return copy;
};
const assertComponent = (existing, approved) => {
  for (const key of ['name', 'is_root', 'is_nestable']) {
    if (existing[key] !== approved[key]) throw new Error(`Existing ${approved.name} component conflicts with homepage schema.`);
  }
  for (const [name, field] of Object.entries(approved.schema)) {
    // Added by #120's dedicated migration; their absence is valid before it runs.
    if (approved.name === 'project_feed' && Object.hasOwn(WORK_POSITION_FIELDS, name) && !Object.hasOwn(existing.schema ?? {}, name)) continue;
    if (!existing.schema?.[name] || !equal(normalizeField(existing.schema[name]), field)) {
      throw new Error(`Existing ${approved.name}.${name} conflicts with homepage schema.`);
    }
  }
};
const uidFor = (homeUuid, component) => {
  const hex = createHash('sha256').update(`${homeUuid}:homepage:${component}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`;
};
export const homepageBaselineBody = (homeUuid, siteUuid) => [
  { _uid: uidFor(homeUuid,'information'), component:'information', site:siteUuid },
  { _uid: uidFor(homeUuid,'navigation'), component:'navigation', site:siteUuid },
  { _uid: uidFor(homeUuid,'project_feed'), component:'project_feed', collection:'projects/' },
];
const withoutUids = body => Array.isArray(body) ? body.map(({_uid, _editable, ...block}) => {
  if (block.component === 'project_feed') {
    for (const field of Object.keys(WORK_POSITION_FIELDS)) delete block[field];
  }
  return block;
}) : body;

async function snapshot(api) {
  const [components, homes, sites] = await Promise.all([
    api.listComponents(), api.findStoriesByFullSlug('home'), api.findStoriesByFullSlug('site'),
  ]);
  const homeSummary = homes.find(story => story.full_slug === 'home' && !story.is_folder);
  const siteSummary = sites.find(story => story.full_slug === 'site' && !story.is_folder);
  if (!homeSummary || !siteSummary) throw new Error('Existing canonical Home and Site stories are required.');
  const [home, site] = await Promise.all([api.getStory(homeSummary.id), api.getStory(siteSummary.id)]);
  if (home?.content?.component !== 'home_page' || !home.uuid || site?.content?.component !== 'site_settings' || !site.uuid) {
    throw new Error('Home and Site must use their canonical components and UUIDs.');
  }
  // Include all component definitions in the backup, but compare only relevant ones.
  return { home, site, components };
}
const relevant = snapshot => ({
  home: snapshot.home, site: snapshot.site,
  components: snapshot.components.filter(c => ['home_page', ...HOMEPAGE_COMPONENTS.map(c => c.name)].includes(c.name)).sort((a,b) => a.name.localeCompare(b.name)),
});

export async function runHomepageMigration({ api, mode='plan', backup }) {
  if (!['plan','apply'].includes(mode)) throw new Error('Homepage migration supports plan or apply only; publishing is separate.');
  const original = await snapshot(api);
  const { home, site, components } = original;
  const homeComponent = components.find(c => c.name === 'home_page');
  if (!homeComponent?.schema) throw new Error('Existing home_page schema is required.');
  const merged = structuredClone(homeComponent);
  const actions = [];
  for (const approved of HOMEPAGE_COMPONENTS) {
    const existing = components.find(c => c.name === approved.name);
    if (existing) assertComponent(existing,approved);
    else actions.push({kind:'create-component',name:approved.name});
  }
  if (Object.hasOwn(merged.schema,'body')) {
    if (!equal(normalizeField(merged.schema.body),HOMEPAGE_BODY_FIELD)) throw new Error('Existing Home body field conflicts with homepage schema.');
  } else {
    merged.schema.body = structuredClone(HOMEPAGE_BODY_FIELD);
    actions.push({kind:'add-home-body-field',id:homeComponent.id});
  }
  const body = homepageBaselineBody(home.uuid,site.uuid);
  if (Object.hasOwn(home.content,'body')) {
    if (!equal(withoutUids(home.content.body),withoutUids(body))) {
      throw new Error('Home already has a different composition; preserving it for review.');
    }
  } else actions.push({kind:'save-home-draft',id:home.id,order:body.map(b => b.component)});
  if (mode === 'apply' && actions.length) {
    if (typeof backup !== 'function') throw new Error('A durable backup writer is required before applying the homepage migration.');
    // Re-read before any write; fail rather than clobber an intervening edit.
    const fresh = await snapshot(api);
    if (!equal(relevant(original),relevant(fresh))) throw new Error('Storyblok content or schema changed since planning; rerun the migration plan.');
    await backup(structuredClone(original));
    for (const approved of HOMEPAGE_COMPONENTS) {
      if (!components.some(c => c.name === approved.name)) await api.createComponent(structuredClone(approved));
    }
    if (actions.some(a => a.kind === 'add-home-body-field')) await api.updateComponent(homeComponent.id,merged);
    if (actions.some(a => a.kind === 'save-home-draft')) {
      const latestHome = await api.getStory(home.id);
      if (!equal(home,latestHome)) throw new Error('Home changed during schema migration; additive schema saved, Home draft preserved.');
      await api.updateStory(home.id,{content:{...home.content,body}});
    }
  }
  return { actions, homeId:home.id, siteId:site.id };
}
