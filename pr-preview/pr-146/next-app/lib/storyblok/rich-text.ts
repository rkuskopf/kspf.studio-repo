const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nodeText = (node: unknown): string | null => {
  if (!isRecord(node) || typeof node.type !== "string") return null;
  if (node.type === "text") return typeof node.text === "string" ? node.text : null;
  if (node.type === "hard_break") return "\n";
  if (node.content === undefined) return "";
  if (!Array.isArray(node.content)) return null;

  const parts = node.content.map(nodeText);
  if (parts.some((part) => part === null)) return null;
  const separator =
    node.type === "doc" || node.type === "bullet_list" || node.type === "ordered_list"
      ? "\n"
      : "";
  return (parts as string[]).join(separator);
};

export const storyblokPlainText = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (!isRecord(value) || value.type !== "doc" || !Array.isArray(value.content)) {
    return null;
  }

  const blocks = value.content.map(nodeText);
  if (blocks.some((block) => block === null)) return null;
  return (blocks as string[]).map((block) => block.trimEnd()).join("\n");
};
