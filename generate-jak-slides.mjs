import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SLIDES_DIR = path.join("assets", "images", "jakslideshow");
const OUT_FILE = path.join(SLIDES_DIR, "slides.json");
const ALLOWED_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

const entries = await readdir(SLIDES_DIR, { withFileTypes: true });
const slides = entries
  .filter((e) => e.isFile())
  .map((e) => e.name)
  .filter((name) => ALLOWED_EXT.has(path.extname(name).toLowerCase()))
  .map((name) => {
    const match = name.match(/\d+/);
    return { name, index: match ? Number.parseInt(match[0], 10) : null };
  })
  .sort((a, b) => {
    if (a.index == null && b.index == null) return a.name.localeCompare(b.name);
    if (a.index == null) return 1;
    if (b.index == null) return -1;
    if (a.index !== b.index) return a.index - b.index;
    return a.name.localeCompare(b.name);
  })
  .map((item) => item.name)
  .map((name) => path.posix.join("assets/images/jakslideshow", name));

await writeFile(OUT_FILE, JSON.stringify(slides, null, 2) + "\n", "utf8");
console.log(`Wrote ${slides.length} slide(s) to ${OUT_FILE}`);
