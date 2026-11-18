import { Fragment } from "react";
import { safeLabelHref } from "../../scripts/storyblok-label-links.mjs";
import type { ProjectLabelPart } from "../lib/storyblok/types";

export default function ProjectLabel({ text, parts }: { text: string; parts?: ProjectLabelPart[] }) {
  if (!parts) {
    return text.split("\n").map((line, index) => (
      <span key={index}>{index > 0 ? <br /> : null}{line}</span>
    ));
  }
  return parts.map((part, index) => {
    const content = part.text.split("\n").map((line, lineIndex) => (
      <Fragment key={lineIndex}>{lineIndex > 0 ? <br /> : null}{line}</Fragment>
    ));
    const href = safeLabelHref(part.href);
    return href ? (
      <a key={index} href={href} target={part.target === "_blank" ? "_blank" : undefined}
        rel={part.target === "_blank" ? "noopener noreferrer" : undefined}>
        {content}
      </a>
    ) : <Fragment key={index}>{content}</Fragment>;
  });
}
