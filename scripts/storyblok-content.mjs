const firstBlock = (value) => (Array.isArray(value) && value.length ? value[0] : {});
const blocks = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const textItems = (value) =>
  blocks(value)
    .map((item) => (typeof item === "string" ? item : item.text))
    .filter((item) => typeof item === "string" && item.length);

export const storyblokLink = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value.linktype === "email") {
    const email = value.email || value.url || value.cached_url || "";
    return email ? `mailto:${String(email).replace(/^mailto:/i, "")}` : "";
  }
  if (value.linktype === "story" && value.cached_url) {
    return value.anchor ? `/${value.cached_url}#${value.anchor}` : `/${value.cached_url}`;
  }
  return value.url || value.cached_url || value.filename || "";
};

export const storyblokAsset = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.filename || value.url || "";
};

const slideUrls = (value) =>
  blocks(value)
    .map((slide) => {
      if (typeof slide === "string") return slide;
      return storyblokAsset(slide.asset) || slide.legacy_url || "";
    })
    .filter(Boolean);

const requireComponent = (story, component) => {
  if (!story || !story.content) {
    throw new Error(`Storyblok story for ${component} is missing content.`);
  }
  if (story.content.component !== component) {
    throw new Error(
      `Storyblok story "${story.full_slug || story.slug || story.name}" uses ` +
        `"${story.content.component}" instead of "${component}".`
    );
  }
  return story.content;
};

export const mapSiteStory = (story) => {
  const content = requireComponent(story, "site_settings");
  const nav = firstBlock(content.nav);
  const information = firstBlock(content.information_overlay);
  const footer = firstBlock(content.footer);

  return {
    nav: {
      homeLabel: nav.home_label || "",
      homeHref: storyblokLink(nav.home_href),
      informationLabel: nav.information_label || "",
      informationHref: storyblokLink(nav.information_href),
      closeLabel: nav.close_label || "",
    },
    informationOverlay: {
      contactTitle: information.contact_title || "",
      contactBody: information.contact_body || "",
      contactEmail: information.contact_email || "",
      servicesTitle: information.services_title || "",
      services: textItems(information.services),
    },
    profile: content.profile || "",
    footer: {
      brand: footer.brand || "",
      profileLabel: footer.profile_label || "",
      contactLabel: footer.contact_label || "",
      title: footer.services_label || "",
      contact: blocks(footer.contacts).map((item) => ({
        label: item.label || "",
        href: storyblokLink(item.href),
      })),
      columns: blocks(footer.columns).map((column) => ({
        groups: blocks(column.groups).map((group) => ({
          heading: group.heading || "",
          href: storyblokLink(group.href),
          items: textItems(group.items),
        })),
      })),
    },
  };
};

export const mapHomeStory = (story) => {
  const content = requireComponent(story, "home_page");
  return {
    title: content.title || "",
    metaDescription: content.meta_description || "",
    intro: content.intro || "",
  };
};

export const mapExperienceStory = (story) => {
  const content = requireComponent(story, "experience_page");
  return {
    navIntro: content.nav_intro || "",
    heroText: content.hero_text || "",
    ctaLabel: content.cta_label || "",
    ctaHref: storyblokLink(content.cta_href),
    casesTitle: content.cases_title || "",
    cases: blocks(content.cases).map((item) => ({
      title: item.title || "",
      company: item.company || "",
      service: item.service || "",
      href: storyblokLink(item.href),
      mediaImage: storyblokAsset(item.media) || item.legacy_media_url || "",
      mediaClass: item.media_class || "",
    })),
  };
};

export const mapProjectStory = (story) => {
  const content = requireComponent(story, "project");
  return {
    title: content.title || "",
    displayName: content.display_name || content.title || story.name || "",
    category: content.category || "",
    description: content.description || "",
    viewUrl: storyblokLink(content.view_url),
    slides: slideUrls(content.slides),
    alt: content.alt || "",
    showOnHome: content.show_on_home !== false,
  };
};

export const mapCaseStudyStory = (story) => {
  const content = requireComponent(story, "case_study");
  return {
    title: content.title || "",
    summary: content.summary || "",
    roleLabel: content.role_label || "",
    roleValue: content.role_value || "",
    slides: slideUrls(content.slides),
    tabs: blocks(content.tabs).map((tab) => ({
      key: tab.key || "",
      label: tab.label || "",
      subtitle: tab.subtitle || "",
      body: tab.body || "",
      layout: tab.layout || "media",
      items: blocks(tab.items).map((item) => ({
        title: item.title || "",
        description: item.description || "",
      })),
      slides: slideUrls(tab.slides),
    })),
  };
};

const storyOrder = (story) => {
  const configured = Number(story && story.content && story.content.order);
  if (Number.isFinite(configured)) return configured;
  const position = Number(story && story.position);
  return Number.isFinite(position) ? position : 0;
};

const safeCaseFilename = (story) => {
  const raw = String(story.slug || "case-study")
    .replace(/\.json$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${raw || "case-study"}.json`;
};

export const buildContentFiles = ({ site, home, experience, projects, caseStudies }) => {
  const sortedProjects = [...projects].sort((a, b) => storyOrder(a) - storyOrder(b));
  if (!sortedProjects.length) {
    throw new Error("Storyblok returned no project stories; refusing to deploy an empty homepage.");
  }

  const files = new Map([
    ["content/site.json", mapSiteStory(site)],
    ["content/home.json", mapHomeStory(home)],
    ["content/experience.json", mapExperienceStory(experience)],
    ["projects.json", { projects: sortedProjects.map(mapProjectStory) }],
  ]);

  caseStudies.forEach((story) => {
    files.set(`content/case-studies/${safeCaseFilename(story)}`, mapCaseStudyStory(story));
  });

  return files;
};
