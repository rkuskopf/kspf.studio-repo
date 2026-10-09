export type CaptionPosition = 'left' | 'right' | 'bottom-left' | 'bottom-right' | 'hidden';
export type WorkCaptionPositions = Record<'number' | 'title' | 'category' | 'caption', CaptionPosition>;
export const DEFAULT_WORK_POSITIONS: WorkCaptionPositions;
export const CAPTION_POSITION_OPTIONS: { name: string; value: CaptionPosition }[];
export const WORK_POSITION_FIELDS: Record<string, Record<string, unknown>>;
export function mapWorkCaptionPositions(content?: Record<string, unknown>): WorkCaptionPositions;
export function legacyWorkCaptionPositions(layout?: string): WorkCaptionPositions;
