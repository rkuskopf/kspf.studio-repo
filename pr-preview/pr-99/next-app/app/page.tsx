import { loadHomePage } from "../lib/storyblok/server";
import type { HomePageData, StoryblokSearchParams } from "../lib/storyblok/types";
import HomepageInitialPosition from "./homepage-initial-position";
import HomepageSlideshow from "./homepage-slideshow";
import StoryblokPreviewBridge from "./storyblok-preview-bridge";

export const dynamic = "force-dynamic";

export function HomeContentView({ data }: { data: HomePageData }) {
  const { information, nav } = data.site;
  const contactLines = information.contactBody.split("\n");

  return (
    <main
      className="homepage"
      data-storyblok-content={data.isPreview ? "draft" : "published"}
    >
      <HomepageInitialPosition section={data.content.initialSection} />
      <section
        className="homepage-information"
        id="information"
        aria-labelledby="information-title"
        tabIndex={-1}
      >
        <div className="homepage-information__inner">
          <h1 id="information-title">{information.title}</h1>
          <p>{information.profile}</p>
          <div className="homepage-information__details">
            <div>
              <h2>{information.contactTitle}</h2>
              {information.contactBody ? (
                <p>
                  {contactLines.map((line, index) => (
                    <span key={`${line}-${index}`}>
                      {index > 0 ? <br /> : null}
                      {line}
                    </span>
                  ))}
                </p>
              ) : null}
              {information.contactEmail ? (
                <a href={`mailto:${information.contactEmail.replace(/^mailto:/i, "")}`}>
                  {information.contactEmail.replace(/^mailto:/i, "")}
                </a>
              ) : null}
            </div>
            <div>
              <h2>{information.servicesTitle}</h2>
              <ul>
                {information.services.map((service) => (
                  <li key={service}>{service}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="homepage-stage" id="work" tabIndex={-1}>
        <header className="homepage-top" hidden={!data.content.showNavigation}>
          <nav className="homepage-nav" aria-label="Primary">
            <a className="homepage-nav__home" href="#work">
              {nav.homeLabel}
            </a>
            <p className="homepage-nav__intro" title={data.content.intro}>
              {data.content.intro}
            </p>
            <a className="homepage-nav__information" href="#information">
              {nav.informationLabel}
            </a>
          </nav>
        </header>

        <div className="homepage-projects">
          {data.projects.map((project, index) => {
            const titleId = `homepage-project-${project.slug}-title`;
            return (
              <section
                className="homepage-project"
                aria-labelledby={titleId}
                key={project.storyId}
              >
                <p className="homepage-project__name" id={titleId}>
                  {project.displayName}
                </p>
                <HomepageSlideshow project={project} priority={index === 0} />
                <p className="homepage-project__category">{project.category}</p>
              </section>
            );
          })}
        </div>
      </div>
      {data.isPreview ? <StoryblokPreviewBridge /> : null}
    </main>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<StoryblokSearchParams>;
}) {
  const data = await loadHomePage({ searchParams: await searchParams });
  return <HomeContentView data={data} />;
}
