export const CAPTION_POSITION_OPTIONS = [
  { name: 'Left', value: 'left' },
  { name: 'Right', value: 'right' },
  { name: 'Bottom left', value: 'bottom-left' },
  { name: 'Bottom right', value: 'bottom-right' },
  { name: 'Hidden', value: 'hidden' },
];
export const DEFAULT_WORK_POSITIONS = { number: 'left', title: 'bottom-left', category: 'right', caption: 'bottom-right' };
export const WORK_POSITION_FIELDS = Object.fromEntries([
  ['title', 'Project title'], ['category', 'Category'],
  ['caption', 'Image caption / slideshow counter'], ['number', 'Project number'],
].map(([key, label], index) => [`${key}_position`, {
  type: 'option', display_name: `${label} position`, pos: index + 1,
  source: 'self', default_value: DEFAULT_WORK_POSITIONS[key],
  options: CAPTION_POSITION_OPTIONS,
  description: 'Shared by every project in Work. On mobile, Left and Right move below the image.',
}]));
export function mapWorkCaptionPositions(content = {}) {
  return Object.fromEntries(Object.entries(DEFAULT_WORK_POSITIONS).map(([key, fallback]) => [
    key, CAPTION_POSITION_OPTIONS.some(option => option.value === content[`${key}_position`])
      ? content[`${key}_position`] : fallback,
  ]));
}
export function legacyWorkCaptionPositions(layout) {
  switch (layout) {
    case 'flipped': return { ...DEFAULT_WORK_POSITIONS, number: 'right', category: 'left' };
    case 'below': return { ...DEFAULT_WORK_POSITIONS, category: 'bottom-right' };
    case 'below-flipped': return { number: 'left', category: 'bottom-left', title: 'bottom-right', caption: 'bottom-right' };
    default: return { ...DEFAULT_WORK_POSITIONS };
  }
}
