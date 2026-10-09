import type { CSSProperties, ReactNode } from 'react';
import type { CaptionPosition, HomeContent, HomepageProject, WorkCaptionPositions } from '../lib/storyblok/types';
import ProjectLabel from './project-label';

// Both responsive variants use the same field order and slideshow state.
// CSS exposes only one variant; title IDs live outside them to remain unique.
const fields = ['number', 'title', 'category', 'caption'] as const;
export default function HomepageWorkCaptions({ project, number, positions, captions, titleId, index, mediaWidth }: {
  project: HomepageProject;
  number: string;
  positions: WorkCaptionPositions;
  captions?: HomeContent['captions'];
  titleId?: string;
  index: number;
  mediaWidth?: number;
}) {
  const labels: Record<typeof fields[number], ReactNode> = {
    number: captions?.showNumber === false ? null : number,
    title: captions?.showTitle === false || !project.displayName.trim() ? null : <ProjectLabel text={project.displayName} parts={project.displayNameParts} />,
    category: captions?.showCategory === false || !project.category.trim() ? null : <ProjectLabel text={project.category} parts={project.categoryParts} />,
    caption: captions?.showCaption === false ? null : project.showSlideshowCounter ? <>
      <span className="homepage-project__slide-current" aria-hidden="true">{String(index + 1).padStart(3, '0')}</span>
      <span aria-hidden="true">{String(project.slides.length).padStart(3, '0')}</span>
    </> : project.sideCaption?.trim() ? <ProjectLabel text={project.sideCaption} parts={project.sideCaptionParts} /> : null,
  };
  for (const field of fields) {
    if (positions[field] === 'hidden') labels[field] = null;
  }
  const classes = {number: 'number', title: 'name', category: 'category', caption: 'side-caption'};
  const slot = (position: CaptionPosition, mobile = false) => {
    const children = fields.filter(field => {
      const placement = positions[field];
      const target = mobile && placement === 'left' ? 'bottom-left' : mobile && placement === 'right' ? 'bottom-right' : placement;
      return target === position && labels[field] !== null;
    });
    if (!children.length) return null;
    return <div className="work-caption-slot" data-caption-slot={mobile ? undefined : position} data-mobile-caption-slot={mobile ? position : undefined}>
      {children.map(field => <p key={field}
        className={`homepage-project__${classes[field]}${field === 'caption' && project.showSlideshowCounter ? ' homepage-project__slide-counter' : ''}`}
        data-caption-field={field}
        aria-label={field === 'caption' && project.showSlideshowCounter ? `Slide ${index + 1} of ${project.slides.length}` : undefined}
      >{labels[field]}</p>)}
    </div>;
  };
  const bottomLeft = slot('bottom-left');
  const bottomRight = slot('bottom-right');
  return <div className="work-captions" style={mediaWidth ? { '--work-caption-width': `${mediaWidth}px` } as CSSProperties : undefined}>
    {labels.title !== null ? <span className="work-captions__title-label" id={titleId} aria-hidden="true">{project.displayName}</span> : null}
    <div className="work-captions__desktop">
      {slot('left')}{slot('right')}
      {bottomLeft || bottomRight ? <div className="work-captions__bottom">{bottomLeft}{bottomRight}</div> : null}
    </div>
    <div className="work-captions__mobile">{slot('bottom-left', true)}{slot('bottom-right', true)}</div>
  </div>;
}
