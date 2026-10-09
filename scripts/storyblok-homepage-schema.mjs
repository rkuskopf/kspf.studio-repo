const siteReference = {
  type: 'option', display_name: 'Site settings', pos: 0, required: true,
  source: 'internal_stories', use_uuid: true, filter_content_type: ['site_settings'],
  description: 'Reference the existing Site settings story; content is not copied.',
};
export const HOMEPAGE_COMPONENTS = [
  { name: 'information', display_name: 'Information', is_root: false, is_nestable: true, schema: { site: { ...siteReference } } },
  { name: 'navigation', display_name: 'Navigation', is_root: false, is_nestable: true, schema: { site: { ...siteReference } } },
  { name: 'project_feed', display_name: 'Work', is_root: false, is_nestable: true, schema: {
    collection: { type: 'option', display_name: 'Project collection', pos: 0, required: true, default_value: 'projects/', options: [{ name: 'Projects — automatic Show on home feed', value: 'projects/' }] },
  } },
];
export const HOMEPAGE_BODY_FIELD = {
  type: 'bloks', display_name: 'Page blocks', pos: 10, restrict_components: true,
  component_whitelist: ['information', 'navigation', 'project_feed'], minimum: 3, maximum: 3,
  description: 'One Information, Navigation and Work block, in any order. Composition applies to the Next.js homepage.',
};
