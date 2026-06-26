import { cpSync, mkdirSync, rmSync } from "node:fs";

const files = [
  "app.js",
  "assets",
  "capitals.js",
  "index.html",
  "manifest.webmanifest",
  "service-worker.js",
  "styles.css"
];

rmSync("dist", { force: true, recursive: true });
mkdirSync("dist");

for (const file of files) {
  cpSync(file, `dist/${file}`, { recursive: true });
}
