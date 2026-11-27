// Shared defaults for the static and Next homepages. Missing fields preserve the current layout.
export const homepageCaptions = (content = {}) => ({
  layout: ["current", "flipped", "below", "below-flipped"].includes(content.caption_layout) ? content.caption_layout : "current",
  showNumber: content.show_project_numbers !== false,
  showTitle: content.show_project_titles !== false,
  showCategory: content.show_project_categories !== false,
  showCaption: content.show_image_captions !== false,
});
