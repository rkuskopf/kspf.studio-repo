import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { basename, join } from "node:path";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const uid = () => randomUUID();
const blok = (component, values = {}) => ({ _uid: uid(), component, ...values });

const toLink = (href) => {
  const value = String(href || "");
  if (!value) return { id: "", url: "", linktype: "url", fieldtype: "multilink" };
  if (value.startsWith("mailto:")) {
    return {
      id: "",
      url: value.replace(/^mailto:/i, ""),
      email: value.replace(/^mailto:/i, ""),
      linktype: "email",
      fieldtype: "multilink",
    };
  }
  return { id: "", url: value, linktype: "url", fieldtype: "multilink" };
};

const textBloks = (items) =>
  (Array.isArray(items) ? items : []).filter(Boolean).map((text) => blok("text_item", { text }));

const slideBloks = (items) =>
  (Array.isArray(items) ? items : [])
    .filter(Boolean)
    .map((legacyUrl) => blok("media_slide", { legacy_url: legacyUrl }));

const slugify = (value, fallback) => {
  const slug = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const siteStory = (site) => ({
  name: "Site settings",
  slug: "site",
  content: {
    component: "site_settings",
    _uid: uid(),
    nav: [
      blok("nav_settings", {
        home_label: site.nav?.homeLabel || "",
        home_href: toLink(site.nav?.homeHref),
        information_label: site.nav?.informationLabel || "",
        information_href: toLink(site.nav?.informationHref),
        show_about: site.nav?.showAbout === true,
        close_label: site.nav?.closeLabel || "",
      }),
    ],
    information_overlay: [
      blok("information_overlay", {
        contact_title: site.informationOverlay?.contactTitle || "",
        contact_body: site.informationOverlay?.contactBody || "",
        contact_email: site.informationOverlay?.contactEmail || "",
        services_title: site.informationOverlay?.servicesTitle || "",
        services: textBloks(site.informationOverlay?.services),
      }),
    ],
    profile: site.profile || "",
    footer: [
      blok("footer_settings", {
        brand: site.footer?.brand || "",
        profile_label: site.footer?.profileLabel || "",
        contact_label: site.footer?.contactLabel || "",
        services_label: site.footer?.title || "",
        contacts: (site.footer?.contact || []).map((item) =>
          blok("footer_contact", {
            label: item.label || "",
            href: toLink(item.href),
          })
        ),
        columns: (site.footer?.columns || []).map((column) =>
          blok("footer_column", {
            groups: (column.groups || []).map((group) =>
              blok("footer_group", {
                heading: group.heading || "",
                href: toLink(group.href),
                items: textBloks(group.items),
              })
            ),
          })
        ),
      }),
    ],
  },
});

const homeStory = (home) => ({
  name: "Home",
  slug: "home",
  content: {
    component: "home_page",
    _uid: uid(),
    title: home.title || "",
    meta_description: home.metaDescription || "",
    intro: home.intro || "",
  },
});

const experienceStory = (experience) => ({
  name: "Experience",
  slug: "experience",
  content: {
    component: "experience_page",
    _uid: uid(),
    nav_intro: experience.navIntro || "",
    hero_text: experience.heroText || "",
    cta_label: experience.ctaLabel || "",
    cta_href: toLink(experience.ctaHref),
    cases_title: experience.casesTitle || "",
    cases: (experience.cases || []).map((item) =>
      blok("experience_case", {
        title: item.title || "",
        company: item.company || "",
        service: item.service || "",
        href: toLink(item.href),
        legacy_media_url: item.mediaImage || "",
        media_class: item.mediaClass || "",
      })
    ),
  },
});

const projectStory = (project, index) => ({
  name: project.displayName || project.title || `Project ${index + 1}`,
  slug: slugify(project.displayName || project.title, `project-${index + 1}`),
  content: {
    component: "project",
    _uid: uid(),
    title: project.title || "",
    display_name: project.displayName || project.title || "",
    category: project.category || "",
    description: project.description || "",
    view_url: toLink(project.viewUrl),
    slides: slideBloks(project.slides),
    alt: project.alt || "",
    show_on_home: project.showOnHome !== false,
    order: index,
  },
});

const caseStudyStory = (caseStudy, filename) => ({
  name: caseStudy.title || basename(filename, ".json"),
  slug: basename(filename, ".json"),
  content: {
    component: "case_study",
    _uid: uid(),
    title: caseStudy.title || "",
    summary: caseStudy.summary || "",
    role_label: caseStudy.roleLabel || "",
    role_value: caseStudy.roleValue || "",
    slides: slideBloks(caseStudy.slides),
    tabs: (caseStudy.tabs || []).map((tab) =>
      blok("case_study_tab", {
        key: tab.key || "",
        label: tab.label || "",
        subtitle: tab.subtitle || "",
        body: tab.body || "",
        layout: tab.layout || "media",
        items: (tab.items || []).map((item) =>
          blok("case_study_item", {
            title: item.title || "",
            description: item.description || "",
          })
        ),
        slides: slideBloks(tab.slides),
      })
    ),
  },
});

export const buildSeedPlan = async (repoRoot) => {
  const [site, home, experience, projectData] = await Promise.all([
    readJson(join(repoRoot, "content/site.json")),
    readJson(join(repoRoot, "content/home.json")),
    readJson(join(repoRoot, "content/experience.json")),
    readJson(join(repoRoot, "projects.json")),
  ]);

  const caseDir = join(repoRoot, "content/case-studies");
  const caseFiles = (await readdir(caseDir)).filter((name) => name.endsWith(".json")).sort();
  const caseStudies = await Promise.all(
    caseFiles.map(async (filename) => caseStudyStory(await readJson(join(caseDir, filename)), filename))
  );

  const projects = Array.isArray(projectData) ? projectData : projectData.projects || [];

  return {
    rootStories: [siteStory(site), homeStory(home), experienceStory(experience)],
    folders: [
      {
        name: "Projects",
        slug: "projects",
        stories: projects.map(projectStory),
      },
      {
        name: "Case studies",
        slug: "case-studies",
        stories: caseStudies,
      },
    ],
  };
};
