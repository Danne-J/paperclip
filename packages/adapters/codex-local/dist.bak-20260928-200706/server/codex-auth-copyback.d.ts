/** Outcome of a copy-back attempt. No token material is ever surfaced. */
export type CopyBackCodexAuthOutcome = "copied" | "kept-host";
export interface CopyBackCodexAuthInput {
    /**
     * Reads the sandbox `auth.json` bytes back from the (about-to-be-destroyed)
     * sandbox. In production this is bound to the managed-runtime restore
     * context's `readFile` for `${assetDir}/auth.json`.
     */
    readSandboxAuth: () => Promise<Buffer>;
    /**
     * Absolute path of the shared host credential to (maybe) overwrite — the
     * symlink *source* the managed Codex homes point their `auth.json` at, never
     * an in-sandbox or per-agent symlink.
     */
    hostAuthPath: string;
    /** Non-leaking progress sink: receives decision/outcome lines only. */
    log: (line: string) => void | Promise<void>;
    /**
     * Resolves and ensures the per-identity cache slot path for a sandbox
     * `account_id`. When this is provided AND the cache off-switch is on, the
     * copy-back also writes the fresher, usable subscription credential into its
     * per-identity cache slot as a second, additive write, keyed by the real
     * `account_id`. This is independent of the host default overwrite: it can
     * write a cache slot for a different identity than the host holds (matrix rows
     * 1b, 3), and it never touches the host default store. When absent, no cache
     * write happens.
     */
    resolveCacheEntryPath?: (accountId: string) => Promise<string>;
    /** Environment for the cache off-switch read. Defaults to `process.env`. */
    env?: NodeJS.ProcessEnv;
}
/**
 * Guards, locks, and atomically installs a strictly-newer sandbox Codex
 * `auth.json` onto the shared host credential at teardown.
 *
 * Sequence, all under `withDirectoryMergeLock` on the host target's directory
 * so a concurrent inbound restore or another copy-back can't interleave:
 *   1. Read the sandbox credential bytes. A genuinely absent sandbox
 *      `auth.json` (ENOENT) means there is simply nothing to copy back, so it
 *      resolves to `kept-host` (benign no-op, host untouched); every other read
 *      error stays fail-loud.
 *   2. Stage them to a `0600` temp file on the **same filesystem** as the host
 *      target (its directory), which doubles as the predicate `source`.
 *   3. Run the Phase-3 decision predicate (`source` = sandbox temp, `destination`
 *      = host). Exit 10 → adopt the sandbox copy; exit 20 → keep the host copy.
 *   4. On exit 10, `rename` the staged temp over the host target — an atomic
 *      same-directory swap that preserves mode `0600`. On exit 20, discard it.
 * The staged temp is always removed (rename consumes it on the copy path; the
 * finally cleans it up otherwise), so a failure never leaves a partial file.
 * Never logs token bytes — only the decision outcome.
 */
export declare function copyBackCodexAuth(input: CopyBackCodexAuthInput): Promise<CopyBackCodexAuthOutcome>;
//# sourceMappingURL=codex-auth-copyback.d.ts.map