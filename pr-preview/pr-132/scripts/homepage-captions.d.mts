export type HomepageCaptions = {
  layout: "current" | "flipped" | "below" | "below-flipped";
  showNumber: boolean;
  showTitle: boolean;
  showCategory: boolean;
  showCaption: boolean;
};
export function homepageCaptions(content?: Record<string, unknown>): HomepageCaptions;
