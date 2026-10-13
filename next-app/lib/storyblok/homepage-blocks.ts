import type { HomeBlock } from './types';
import { mapWorkCaptionPositions } from '../../../scripts/work-caption-positions.mjs';

export function legacyHomeBlocks(site: string): HomeBlock[] {
  return [
    { _uid: 'legacy-information', component: 'information', site },
    { _uid: 'legacy-navigation', component: 'navigation', site },
    { _uid: 'legacy-work', component: 'project_feed', collection: 'projects/' },
  ];
}

export function mapHomeBlocks(value: unknown): HomeBlock[] {
  const invalid = (detail: string): never => { throw new Error(`Storyblok home body ${detail}.`); };
  if (!Array.isArray(value) || value.length !== 3) {
    return invalid('must contain exactly one Information, Navigation and Work block');
  }
  const uids = new Set<string>();
  const components = new Set<string>();
  return value.map((block): HomeBlock => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return invalid('has an invalid block');
    const { _uid, component } = block;
    if (typeof _uid !== 'string' || !_uid.trim() || uids.has(_uid)) return invalid('requires unique nonempty block UIDs');
    uids.add(_uid);
    if (!['information', 'navigation', 'project_feed'].includes(component) || components.has(component)) {
      return invalid('requires one of each supported core component');
    }
    components.add(component);
    if (component === 'project_feed') {
      if (block.collection !== 'projects/') return invalid('Work must use the projects/ collection');
      return { _uid, component, collection: 'projects/', positions: mapWorkCaptionPositions(block) };
    }
    if (typeof block.site !== 'string' || !block.site.trim()) return invalid('requires a Site story reference');
    return { _uid, component, site: block.site };
  });
}
