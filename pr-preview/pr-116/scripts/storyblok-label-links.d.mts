export type ProjectLabelPart = {
  text: string;
  href?: string;
  target?: "_blank";
};

export function safeLabelHref(value: unknown): string | undefined;
export function storyblokLabelParts(value: unknown, links?: unknown): ProjectLabelPart[] | undefined;
