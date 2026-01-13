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
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  .map((name) => path.posix.join("assets/images/jakslideshow", name));

await writeFile(OUT_FILE, JSON.stringify(slides, null, 2) + "\n", "utf8");
console.log(`Wrote ${slides.length} slide(s) to ${OUT_FILE}`);
