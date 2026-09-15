const field = (type, displayName, pos, extra = {}) => ({
  type,
  display_name: displayName,
  pos,
  ...extra,
});

const blocks = (displayName, pos, allowed, extra = {}) =>
  field("bloks", displayName, pos, {
    restrict_components: true,
    component_whitelist: Array.isArray(allowed) ? allowed : [allowed],
    ...extra,
  });

export const PROJECT_PAGE_COMPONENT_NAMES = ["project_tag", "project_header", "text", "media"];

export const PROJECT_PAGE_COMPONENTS = [
  {
    name: "project_tag",
    display_name: "Project tag",
    is_root: false,
    is_nestable: true,
    preview_field: "label",
    schema: {
      label: field("text", "Label", 0, { required: true }),
    },
  },
  {
    name: "project_header",
    display_name: "Project header",
    is_root: false,
    is_nestable: true,
    schema: {},
  },
  {
    name: "text",
    display_name: "Text",
    is_root: false,
    is_nestable: true,
    schema: {
      content: field("richtext", "Content", 0, { required: true }),
    },
  },
  {
    name: "media",
    display_name: "Media",
    is_root: false,
    is_nestable: true,
    schema: {
      asset: field("asset", "Asset", 0, {
        required: true,
        filetypes: ["images", "videos"],
        allow_external_url: true,
      }),
      alt: field("text", "Alt text", 1),
      caption: field("textarea", "Caption", 2),
    },
  },
];

export const PROJECT_PAGE_FIELDS = {
  client: field("text", "Client", 9),
  year: field("text", "Year", 10),
  discipline: field("text", "Discipline", 11),
  thumbnail: field("asset", "Thumbnail", 12, {
    filetypes: ["images"],
    allow_external_url: true,
  }),
  tags: blocks("Tags", 13, "project_tag"),
  page_enabled: field("boolean", "Enable project page", 14, {
    default_value: "false",
  }),
  body: blocks("Project page body", 15, ["project_header", "text", "media"]),
};
