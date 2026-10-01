import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

/**
 * Stamp the service worker with a per-build id so bundle-only deploys still
 * refresh parked tabs.
 *
 * `sw.js` is a static public asset copied verbatim into the build, and its
 * update machinery (`service-worker-updates.ts`) only reloads a parked tab when
 * a *new* worker takes control — which happens only when `sw.js` changes
 * byte-for-byte. Without this, a deploy that ships a new app bundle but the same
 * `sw.js` installs no new worker, so an open tab keeps running the old bundle
 * until someone reloads by hand. Rewriting the placeholder with a value derived
 * from the bundle makes `sw.js` change exactly when the app does.
 */

export const SERVICE_WORKER_BUILD_ID_PLACEHOLDER = "__PAPERCLIP_BUILD_ID__";

/**
 * Replace the build-id placeholder in a service-worker source string.
 *
 * Throws when the placeholder is absent: that means the worker drifted away
 * from the contract (renamed or removed placeholder) and would ship a service
 * worker that never rotates — the exact bug this plugin exists to prevent — so
 * a loud build failure beats a silent no-op.
 */
export function stampServiceWorkerBuildId(source: string, buildId: string): string {
  if (!source.includes(SERVICE_WORKER_BUILD_ID_PLACEHOLDER)) {
    throw new Error(
      `service worker is missing the ${SERVICE_WORKER_BUILD_ID_PLACEHOLDER} placeholder; ` +
        "the build cannot stamp a build id and parked tabs would not refresh after a deploy",
    );
  }
  if (!buildId) {
    throw new Error("refusing to stamp the service worker with an empty build id");
  }
  return source.split(SERVICE_WORKER_BUILD_ID_PLACEHOLDER).join(buildId);
}

/**
 * Derive a build id from the emitted bundle. The entry chunk's file name
 * carries a content hash that changes whenever the app code changes and stays
 * stable when it does not, so the worker rotates precisely with the app.
 */
export function deriveBuildIdFromEntryFileName(entryFileName: string): string {
  const base = path.basename(entryFileName).replace(/\.js$/, "");
  // Keep only characters that are safe inside a Cache Storage name.
  const sanitized = base.replace(/[^A-Za-z0-9_-]/g, "-");
  return sanitized || "build";
}

export function serviceWorkerBuildIdPlugin(
  options: { serviceWorkerFileName?: string } = {},
): Plugin {
  const serviceWorkerFileName = options.serviceWorkerFileName ?? "sw.js";
  let buildId: string | null = null;
  let outDir = "dist";

  return {
    name: "paperclip-sw-build-id",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find(
        (chunk) => chunk.type === "chunk" && chunk.isEntry,
      );
      if (entry) {
        buildId = deriveBuildIdFromEntryFileName(entry.fileName);
      }
    },
    closeBundle() {
      const swPath = path.resolve(outDir, serviceWorkerFileName);
      // rolldown-vite (v8) copies publicDir AFTER closeBundle, so dist/sw.js
      // may not exist yet; fall back to the public source so stamping still
      // lands (the copy then overwrites it, so re-stamp after copy below).
      const source = fs.existsSync(swPath)
        ? fs.readFileSync(swPath, "utf8")
        : fs.readFileSync(path.resolve("public", serviceWorkerFileName), "utf8");
      const stamped = stampServiceWorkerBuildId(source, buildId ?? "build");
      fs.writeFileSync(swPath, stamped);
    },
    // vite>=8 (rolldown): publicDir copy lands after closeBundle; restamp
    // there so the copied placeholder does not clobber our stamp.
    writeBundle() {
      const swPath = path.resolve(outDir, serviceWorkerFileName);
      if (!fs.existsSync(swPath)) return;
      const source = fs.readFileSync(swPath, "utf8");
      if (!source.includes(SERVICE_WORKER_BUILD_ID_PLACEHOLDER)) return;
      fs.writeFileSync(swPath, stampServiceWorkerBuildId(source, buildId ?? "build"));
    },
  };
}
