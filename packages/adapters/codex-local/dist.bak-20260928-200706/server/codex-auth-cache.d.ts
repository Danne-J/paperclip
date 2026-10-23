export declare const CODEX_AUTH_CACHE_OFF_SWITCH_ENV = "PAPERCLIP_CODEX_AUTH_CACHE";
/**
 * True when the cache is enabled. The cache is on by default. It turns off only
 * when {@link CODEX_AUTH_CACHE_OFF_SWITCH_ENV} is an explicit falsy value
 * (`0`, `false`, `no`, or `off`).
 */
export declare function isCodexAuthCacheEnabled(env?: NodeJS.ProcessEnv): boolean;
/**
 * Sanitizes an `account_id` to one safe path segment. Rejects an empty value, a
 * relative segment (`.` or `..`), a path separator, and a NUL byte, so a raw
 * `account_id` can never become a path traversal. Returns the trimmed, safe
 * segment. (Security condition 3.)
 */
export declare function toCacheKey(accountId: string): string;
/**
 * Resolves the company-scoped cache root under the same isolation boundary as
 * the managed Codex home (`resolveManagedCodexHomeDir`). The root is always
 * company-scoped, so a Codex credential can never cross a company boundary.
 * There is no instance-global fallback root: `companyId` is required, and an
 * empty value is a fail-loud error. `companyId` is sanitized to a single safe
 * path segment, so a traversal value (`..`, `/etc`, `a/b`) can never make the
 * cache root escape the `companies/` directory. Every downstream path (the
 * entry path, the vend, and the clear) inherits this guard. (Security
 * condition 1.)
 */
export declare function resolveCodexAuthCacheDir(env: NodeJS.ProcessEnv | undefined, companyId: string): string;
/**
 * Resolves the entry path for one identity: `<cacheRoot>/<safeAccountId>/auth.json`.
 * The `account_id` is sanitized by {@link toCacheKey}. After the join, this
 * verifies the resolved entry path stays under the cache root and ends at exactly
 * `<safeAccountId>/auth.json`. This function does no filesystem work; it is safe
 * for a read path (the vend and the clear). (Security condition 3.)
 */
export declare function resolveCodexAuthCacheEntryPath(env: NodeJS.ProcessEnv | undefined, accountId: string, companyId: string): string;
/**
 * Resolves the entry path and creates the cache root and the entry directory
 * private (mode 0700), each guarded by `lstat`. Use this on the write path
 * before the cache slot is written.
 */
export declare function ensureCodexAuthCacheEntryDir(env: NodeJS.ProcessEnv | undefined, accountId: string, companyId: string): Promise<string>;
/**
 * Reads the usable subscription `account_id` from an `auth.json` payload. Returns
 * `null` for an absent, unusable, or api-key credential (no subscription
 * identity). This mirrors `parseAuth` in `codex-auth-merge-decision.cjs`; keep
 * the two in step when the auth format changes.
 */
export declare function readSubscriptionAccountId(bytes: Buffer): string | null;
export type WriteCodexAuthCacheEntryOutcome = "written" | "kept-slot";
/**
 * Writes `sandboxAuthBytes` into its per-identity cache slot when the slot is
 * absent, or when the source is a strictly-newer same-identity subscription
 * credential (seed mode). The mutation runs under the merge lock on the slot
 * directory, through the shared {@link writeCredentialSeedOrNewer} writer. Never
 * logs token bytes or a raw `account_id`.
 */
export declare function writeCodexAuthCacheEntry(input: {
    sandboxAuthBytes: Buffer;
    cacheEntryPath: string;
    log: (line: string) => void | Promise<void>;
    /** Environment for the merge lock root. Defaults to `process.env`. */
    env?: NodeJS.ProcessEnv;
}): Promise<WriteCodexAuthCacheEntryOutcome>;
export type VendCodexAuthOutcome = "vended" | "kept-host" | "no-host-identity";
/**
 * Refreshes the identity the host already holds with a strictly-newer cached
 * credential of the same `account_id`. Identity-anchored:
 *
 * 1. Read the host identity from `sharedHomeAuthPath` first.
 * 2. When the host holds no usable subscription identity, do nothing. The vend
 *    never picks a credential from the cache at random (matrix rows 3, 4).
 * 3. Resolve ONLY that exact identity's cache slot. The vend never scans the
 *    cache root. (Security condition 4.)
 * 4. Run the DEFAULT-mode predicate (cache slot as source, shared home as
 *    destination). Install the cache copy only when it is strictly newer for the
 *    same identity.
 *
 * The vend never changes identity and never stages a spent single-use refresh
 * token (the strictly-newer rule guards it). Never logs token bytes or a raw
 * `account_id`.
 */
export declare function selectVendCredential(sharedHomeAuthPath: string, resolveCacheEntryPath: (accountId: string) => string, log: (line: string) => void | Promise<void>, env?: NodeJS.ProcessEnv): Promise<VendCodexAuthOutcome>;
/**
 * Removes exactly one identity slot from the cache. The `account_id` is
 * sanitized by {@link toCacheKey}, so the removal can never escape the cache
 * root. A missing slot is a benign no-op. Any other removal error is fail-loud.
 */
export declare function clearCodexAuthCacheEntry(env: NodeJS.ProcessEnv | undefined, accountId: string, companyId: string): Promise<void>;
/**
 * Removes every slot in the company-scoped cache root. A missing cache root is a
 * benign no-op.
 */
export declare function clearCodexAuthCache(env: NodeJS.ProcessEnv | undefined, companyId: string): Promise<void>;
//# sourceMappingURL=codex-auth-cache.d.ts.map