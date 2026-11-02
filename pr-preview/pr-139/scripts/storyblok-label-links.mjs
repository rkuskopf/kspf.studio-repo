// Caption data stays plain text, with optional safe links on individual runs.
export const safeLabelHref = (value) => {
  if (typeof value !== "string") return undefined;
  const href = value.trim();
  if (/[\u0000-\u001f\u007f\\]/.test(href)) return undefined;
  if (!/^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i.test(href)) return undefined;
  return href;
};

const linkAttributes = (marks, links) => {
  if (!Array.isArray(marks)) return {};
  const attrs = marks.find((mark) => mark?.type === "link")?.attrs;
  if (!attrs || typeof attrs !== "object") return {};
  let href = attrs.href;
  if (attrs.linktype === "story") {
    const story = attrs.story || links.find((link) => link?.uuid &&
      (link.uuid === attrs.uuid || link.uuid === attrs.href));
    const slug = story?.url || story?.full_slug;
    if (typeof slug === "string") {
      const path = slug.replace(/^\/+/, "");
      href = path === "home" ? "/" : `/${path}`;
    }
  }
  if (attrs.linktype === "email" && typeof href === "string" && !/^mailto:/i.test(href)) {
    href = `mailto:${href}`;
  }
  if (typeof attrs.anchor === "string" && attrs.anchor && typeof href === "string") {
    href = `${href.split("#")[0]}#${encodeURIComponent(attrs.anchor.replace(/^#/, ""))}`;
  }
  href = safeLabelHref(href);
  return href ? { href, ...(attrs.target === "_blank" ? { target: "_blank" } : {}) } : {};
};

const nodeParts = (node, links) => {
  if (!node || typeof node !== "object") return [];
  if (node.type === "text") {
    return typeof node.text === "string" ? [{ text: node.text, ...linkAttributes(node.marks, links) }] : [];
  }
  if (node.type === "hard_break") return [{ text: "\n" }];
  if (!Array.isArray(node.content)) return [];
  const separate = ["doc", "bullet_list", "ordered_list"].includes(node.type);
  return node.content.flatMap((child, index) => [
    ...(separate && index > 0 ? [{ text: "\n" }] : []), ...nodeParts(child, links),
  ]);
};

const trimBlockEnd = (parts) => {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const trimmed = parts[index].text.trimEnd();
    parts[index] = { ...parts[index], text: trimmed };
    if (trimmed) break;
  }
  return parts.filter((part) => part.text);
};

export const storyblokLabelParts = (value, links = []) => {
  if (!value || value.type !== "doc" || !Array.isArray(value.content)) return undefined;
  const parts = value.content.flatMap((node, index) => [
    ...(index > 0 ? [{ text: "\n" }] : []), ...trimBlockEnd(nodeParts(node, Array.isArray(links) ? links : [])),
  ]);
  return parts.some((part) => part.href) ? parts : undefined;
};
