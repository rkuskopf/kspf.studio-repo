import { StoryblokServerRichText } from "@storyblok/react/rsc";
import { Fragment } from "react";

import type {
  ProjectBlock,
  ProjectContent,
  ProjectHeaderBlock,
  ProjectMediaBlock,
  ProjectPageData,
  ProjectTextBlock,
} from "../../../lib/storyblok/types";

type StoryblokRichTextDocument = Parameters<
  typeof StoryblokServerRichText
>[0]["document"];

export function ProjectHeader({
  block,
  project,
}: {
  block: ProjectHeaderBlock;
  project: ProjectContent;
}) {
  const metadata = [
    ["Client", project.metadata.client],
    ["Year", project.metadata.year],
    ["Discipline", project.metadata.discipline],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()));

  return (
    <header
      className="project-page__header"
      data-project-block={block.component}
    >
      <h1>{project.title}</h1>
      {metadata.length ? (
        <dl className="project-page__metadata">
          {metadata.map(([label, value]) => (
            <Fragment key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </Fragment>
          ))}
        </dl>
      ) : null}
      {project.metadata.tags.length ? (
        <ul className="project-page__tags" aria-label="Project tags">
          {project.metadata.tags.map((tag, index) => (
            <li key={`${tag}-${index}`}>{tag}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

export function ProjectText({ block }: { block: ProjectTextBlock }) {
  return (
    <section className="project-page__text" data-project-block={block.component}>
      <StoryblokServerRichText
        document={block.content as StoryblokRichTextDocument}
      />
    </section>
  );
}

export function ProjectMedia({ block }: { block: ProjectMediaBlock }) {
  return (
    <figure className="project-page__media" data-project-block={block.component}>
      {block.asset.type === "image" ? (
        <img src={block.asset.url} alt={block.alt ?? ""} />
      ) : (
        <video
          src={block.asset.url}
          controls
          playsInline
          preload="metadata"
        />
      )}
      {block.caption?.trim() ? <figcaption>{block.caption}</figcaption> : null}
    </figure>
  );
}

const unreachableBlock = (block: never): never => {
  throw new Error(`Unknown mapped project block: ${JSON.stringify(block)}`);
};

function ProjectBlockView({
  block,
  project,
}: {
  block: ProjectBlock;
  project: ProjectContent;
}) {
  switch (block.component) {
    case "project_header":
      return <ProjectHeader block={block} project={project} />;
    case "text":
      return <ProjectText block={block} />;
    case "media":
      return <ProjectMedia block={block} />;
    default:
      return unreachableBlock(block);
  }
}

export function ProjectPageView({ data }: { data: ProjectPageData }) {
  return (
    <main
      className="project-page"
      data-storyblok-content={data.isPreview ? "draft" : "published"}
    >
      {data.content.body.map((block) => (
        <ProjectBlockView
          key={block._uid}
          block={block}
          project={data.content}
        />
      ))}
    </main>
  );
}
