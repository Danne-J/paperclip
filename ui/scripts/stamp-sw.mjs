// Stamp dist/sw.js build id from the emitted entry chunk (rolldown-vite8
// copies publicDir after closeBundle, so the upstream closeBundle plugin
// cannot read dist/sw.js yet — the plugin was removed from vite.config.ts
// and this postbuild step reproduces stampServiceWorkerBuildId).
import fs from "node:fs";
import path from "node:path";
const dist = path.resolve(process.cwd(), "dist");
const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const m = html.match(/index-[A-Za-z0-9_-]+\.js/);
if (!m) { console.error("no entry chunk found for stamp"); process.exit(1); }
const buildId = m[0].replace(/\.js$/, "");
const sw = path.join(dist, "sw.js");
const src = fs.readFileSync(sw, "utf8");
if (!src.includes("__PAPERCLIP_BUILD_ID__")) { console.error("sw.js missing placeholder"); process.exit(1); }
fs.writeFileSync(sw, src.split("__PAPERCLIP_BUILD_ID__").join(buildId));
console.log("stamped dist/sw.js with", buildId);
