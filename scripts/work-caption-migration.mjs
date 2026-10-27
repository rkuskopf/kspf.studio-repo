import { isDeepStrictEqual as equal } from 'node:util';
import { WORK_POSITION_FIELDS, legacyWorkCaptionPositions } from './work-caption-positions.mjs';

const normalize = field => { const value = structuredClone(field); delete value.id; return value; };
async function snapshot(api) {
  const [components, homes] = await Promise.all([api.listComponents(), api.findStoriesByFullSlug('home')]);
  const work = components.find(component => component.name === 'project_feed');
  const summary = homes.find(story => story.full_slug === 'home' && !story.is_folder);
  if (!work?.schema || work.is_root || !work.is_nestable || !summary) throw Error('The existing composable Home and Work component are required (#59).');
  const home = await api.getStory(summary.id);
  if (home?.content?.component !== 'home_page' || !Array.isArray(home.content.body)) throw Error('Home must already have its composable body (#59).');
  const feeds = home.content.body.filter(block => block.component === 'project_feed');
  if (feeds.length !== 1 || feeds[0].collection !== 'projects/') throw Error('Home requires one canonical Work feed.');
  return {home, work};
}

export async function runWorkCaptionMigration({ api, mode = 'plan', backup }) {
  if (!['plan', 'apply'].includes(mode)) throw Error('Use plan or apply; publication is separate.');
  const original = await snapshot(api);
  const { home, work } = original;
  const component = structuredClone(work);
  const added = [];
  const updated = [];
  for (const [key, field] of Object.entries(WORK_POSITION_FIELDS)) {
    if (Object.hasOwn(component.schema, key)) {
      const existing = normalize(component.schema[key]);
      const previous = {...field, options: field.options.filter(option => option.value !== 'hidden')};
      if (equal(existing, previous)) {
        component.schema[key] = {...component.schema[key], options: structuredClone(field.options)};
        updated.push(key);
      } else if (!equal(existing, field)) throw Error(`Work ${key} schema conflicts with the approved position control.`);
    } else { component.schema[key] = structuredClone(field); added.push(key); }
  }
  const content = structuredClone(home.content);
  const feed = content.body.find(block => block.component === 'project_feed');
  const positions = legacyWorkCaptionPositions(content.caption_layout);
  const saved = [];
  for (const key of Object.keys(positions)) {
    const field = `${key}_position`;
    if (!Object.hasOwn(feed, field)) { feed[field] = positions[key]; saved.push(field); }
    else positions[key] = feed[field];
  }
  const actions = [];
  if (added.length) actions.push({kind:'add-work-position-fields', id:work.id, fields:added});
  if (updated.length) actions.push({kind:'add-work-hidden-options', id:work.id, fields:updated});
  if (saved.length) actions.push({kind:'save-home-draft', id:home.id, fields:saved, positions});
  if (mode === 'apply' && actions.length) {
    if (typeof backup !== 'function') throw Error('A durable backup is required before applying Work caption changes.');
    const fresh = await snapshot(api);
    if (!equal(original, fresh)) throw Error('Home content or Work schema changed since planning; rerun the plan.');
    await backup(structuredClone(original));
    if (added.length || updated.length) await api.updateComponent(work.id, component);
    if (saved.length) {
      if (!equal(home, await api.getStory(home.id))) throw Error('Home changed during schema migration; preserving the editorial draft.');
      await api.updateStory(home.id, {content});
    }
  }
  return {actions, positions, homeId:home.id};
}
