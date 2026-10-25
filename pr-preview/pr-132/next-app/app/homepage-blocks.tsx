import type { HomePageData, HomeContent, HomepageProject, SiteContent } from "../lib/storyblok/types";
import { legacyHomeBlocks } from "../lib/storyblok/homepage-blocks";
import HomepageSlideshow from "./homepage-slideshow";

export function HomepageInformation({ site }: { site: SiteContent }) {
  const contactLines = site.information.contactBody.split("\n");
  return (
      <section
        className="homepage-information"
        id="information"
        aria-labelledby="information-title"
        tabIndex={-1}
      >
        <div className="homepage-information__inner">
          <h1 id="information-title">{site.information.title}</h1>
          <p>{site.information.profile}</p>
          <div className="homepage-information__details">
            <div>
              <h2>{site.information.contactTitle}</h2>
              {site.information.contactBody ? (
                <p>
                  {contactLines.map((line, index) => (
                    <span key={`${line}-${index}`}>
                      {index > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </p>
              ) : null}
              {site.information.contactEmail ? (
                <a href={`mailto:${site.information.contactEmail.replace(/^mailto:/i, "")}`}>
                  {site.information.contactEmail.replace(/^mailto:/i, "")}
                </a>
              ) : null}
            </div>
            <div>
              <h2>{site.information.servicesTitle}</h2>
              <ul>
                {site.information.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

  );
}

export function HomepageNavigation({ content, site }: { content: HomeContent; site: SiteContent }) {
  if (!content.showNavigation) return null;
  return (
        <header className="homepage-top">
          <nav className="homepage-nav" aria-label="Primary">
            <a className="homepage-nav__home" style={{ fontWeight: site.nav.homeFontWeight ?? undefined }} href="#work">
              {site.nav.homeLabel}
            </a>
            {content.intro.trim() ? (
              <p className="homepage-nav__intro" title={content.intro}>
                {content.intro}
              </p>
            ) : null}
            <a className="homepage-nav__information" style={{ fontWeight: site.nav.informationFontWeight ?? undefined }} href="#information">
              {site.nav.informationLabel}
            </a>
          </nav>
        </header>

  );
}

export function HomepageWork({ projects }: { projects: HomepageProject[] }) {
  return (
        <div className="homepage-projects">
          {projects.map((project, index) => {
            const number = project.projectNumber?.trim() || String(index + 1);
            const titleId = `homepage-project-${project.slug}-title`;
            return (
              <section
                className="homepage-project"
                aria-labelledby={titleId}
                key={project.storyId}
              >
                <p className="homepage-project__number">
                  {/^\d+$/.test(number) ? number.padStart(3, "0") : number}
                </p>
                <HomepageSlideshow project={project} priority={index === 0} titleId={titleId} />
              </section>
            );
          })}
        </div>
  );
}

export default function HomepageBlocks({ data }: { data: HomePageData }) {
  const body = data.content.body ?? legacyHomeBlocks(data.site.storyUuid);
  const sites = data.sites ?? { [data.site.storyUuid]: data.site };
  return body.map((block, index) => {
    // Preserve the existing overlay geometry for adjacent Navigation → Work.
    // Other orders put Navigation in the flow, in its actual saved DOM position.
    const next = body[index + 1];
    const previous = body[index - 1];
    if (block.component === "navigation" && next?.component === "project_feed") {
      return <div className="homepage-stage" id="work" tabIndex={-1} key={block._uid}>
        <HomepageNavigation content={data.content} site={sites[block.site]} />
        <HomepageWork projects={data.projects} />
      </div>;
    }
    if (block.component === "project_feed" && previous?.component === "navigation") return null;
    switch (block.component) {
      case "information": return <HomepageInformation site={sites[block.site]} key={block._uid} />;
      case "navigation": return <div className="homepage-navigation-block" key={block._uid} hidden={!data.content.showNavigation}>
        <HomepageNavigation content={data.content} site={sites[block.site]} />
      </div>;
      case "project_feed": return <div className="homepage-stage" id="work" tabIndex={-1} key={block._uid}>
        <HomepageWork projects={data.projects} />
      </div>;
    }
  });
}
