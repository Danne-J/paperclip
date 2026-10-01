import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";
/**
 * The allowlist of managed `CODEX_HOME` entries that the codex-local adapter
 * stages into the sandbox `home` asset (see {@link stageCodexHomeForSync}).
 * Derived from the seeding constants so it can never drift from what the adapter
 * actually writes into the home: the copied static config files, the symlinked
 * credential file, and the injected `skills/` directory. Everything else the
 * stock upstream `codex` binary writes at runtime (`*.sqlite`, `*-wal`,
 * `plugins/`, `cache/`, `sessions/`, `shell_snapshots/`, …) is intentionally
 * excluded — it is large host-local runtime state the sandbox run never needs.
 */
export declare const CODEX_SYNC_ALLOWLIST: readonly ["config.json", "config.toml", "instructions.md", "auth.json", "skills"];
export type ManagedCodexMcpGateway = {
    name: string;
    endpointPath: string;
    bearerToken: string;
};
export declare function mergeManagedCodexMcpGateways(primary: ManagedCodexMcpGateway[], secondary: ManagedCodexMcpGateway[]): ManagedCodexMcpGateway[];
export declare function pathExists(candidate: string): Promise<boolean>;
export declare function resolveSharedCodexHomeDir(env?: NodeJS.ProcessEnv): string;
export declare function resolveManagedCodexHomeDir(env: NodeJS.ProcessEnv, companyId?: string): string;
/**
 * True when `homePath` lives under the Paperclip-managed company tree
 * (`<instanceRoot>/companies/<companyId>/...`). This covers both the shared
 * company `codex-home` and the per-agent `agents/<agentId>/codex-home` set by
 * the server-side isolation guard. A path outside that tree is a genuine
 * external/user-supplied override that Paperclip must not seed or overwrite.
 */
export declare function isManagedCodexHomePath(env: NodeJS.ProcessEnv, companyId: string | undefined, homePath: string): boolean;
/**
 * True when the Codex home has a usable `auth.json`. Uses `fs.access` (follows
 * symlinks), so a dangling auth symlink whose source has been removed counts as
 * no usable credentials.
 */
export declare function codexHomeHasUsableAuth(home: string): Promise<boolean>;
export declare function ensureSymlink(target: string, source: string): Promise<void>;
export declare function writeManagedCodexMcpConfig(input: {
    codexHome: string;
    apiBaseUrl: string;
    gateways: ManagedCodexMcpGateway[];
}): Promise<{
    configPath: string;
    warnings: string[];
}>;
/**
 * Writes an `auth.json` containing only `OPENAI_API_KEY` so the codex CLI can
 * authenticate via API key. Overwrites any existing file or symlink at that
 * path. Required because the codex CLI (>= 0.122) ignores the `OPENAI_API_KEY`
 * environment variable and only reads credentials from `$CODEX_HOME/auth.json`.
 */
export declare function writeApiKeyAuthJson(home: string, apiKey: string): Promise<void>;
export interface StageCodexHomeForSyncOptions {
    /** Run id, used only to make the staged temp-dir name traceable in logs. */
    runId?: string;
}
/**
 * Stages exactly {@link CODEX_SYNC_ALLOWLIST} from `effectiveCodexHome` into a
 * fresh private temp dir and returns its path, for registration as the sandbox
 * `home` asset. This replaces syncing the whole managed home + a name denylist:
 * only the files Codex actually needs are uploaded, so oversized runtime state
 * (`sessions/`, `*.sqlite`, `plugins/`, …) never reaches the sandbox.
 *
 * - **Symlinks are dereferenced to bytes** — the single-use `auth.json`
 *   credential (a symlink into the shared source home) and each `skills/` entry
 *   land as real files, never dangling links.
 * - **Missing-but-optional entries are skipped** — no `auth.json` in
 *   keyring-credential mode, or no `config.json`, is not an error.
 * - **`mkdtemp` guarantees the staged dir is `0700`** on POSIX, and every staged
 *   regular file is written `0600` (least privilege), so staged credentials —
 *   `auth.json` (OAuth token) and `config.toml` (managed MCP bearer header) —
 *   are never group/other-readable.
 * - **Fail-closed** — any *unexpected* I/O error removes the partial temp dir
 *   and re-throws, so a run never proceeds with a partial or empty home.
 *
 * The caller owns removing the returned dir on run teardown.
 */
export declare function stageCodexHomeForSync(effectiveCodexHome: string, options?: StageCodexHomeForSyncOptions): Promise<string>;
/**
 * Seeds auth/config into an explicit Paperclip-managed `targetHome`. Symlinks
 * `auth.json` from the shared source home (so ChatGPT-subscription credentials
 * stay live and single-use refresh tokens are not copied), copies the static
 * shared config files, and — when an API key is supplied — writes an API-key
 * `auth.json` instead. A promoted device-login credential — a regular-file
 * `auth.json` holding a subscription identity the shared source does not hold —
 * is kept authoritative: it is neither removed nor replaced by the shared
 * symlink. Used both for the default company home and for the per-agent home
 * set by the server isolation guard.
 */
export declare function seedManagedCodexHome(targetHome: string, env: NodeJS.ProcessEnv, onLog: AdapterExecutionContext["onLog"], options?: {
    apiKey?: string | null;
}): Promise<void>;
export declare function prepareManagedCodexHome(env: NodeJS.ProcessEnv, onLog: AdapterExecutionContext["onLog"], companyId?: string, options?: {
    apiKey?: string | null;
}): Promise<string>;
export type ReconcileManagedCodexHomeStatus = "no_managed_home" | "external_override" | "already_seeded" | "source_auth_missing" | "seeded";
export interface ReconcileManagedCodexHomeInput {
    companyId: string | undefined;
    configuredCodexHome: string | null | undefined;
    apiKey?: string | null;
    /**
     * Set when the agent's persisted `OPENAI_API_KEY` is a secret binding that
     * could not be resolved in this context (e.g. startup reconciliation, which
     * never resolves secrets). When true and the home already has usable auth,
     * reconciliation preserves that auth instead of downgrading it to the shared
     * subscription symlink.
     */
    apiKeySecretBound?: boolean;
    env?: NodeJS.ProcessEnv;
    onLog?: AdapterExecutionContext["onLog"];
}
export interface ReconcileManagedCodexHomeResult {
    status: ReconcileManagedCodexHomeStatus;
    home: string | null;
}
/**
 * Idempotently reconciles a persisted `codex_local` agent home. Phase 1 seeds
 * managed homes at execute time; this is the backfill for agents that already
 * carry a persisted (but unseeded) per-agent `CODEX_HOME` and have not run
 * since the seeding fix landed. Shares the managed-home detection
 * (`isManagedCodexHomePath`) and seeding (`seedManagedCodexHome`) logic so a
 * genuine external/user override is never touched. Safe to re-run: when a valid
 * `auth.json` is already present (and no API-key rewrite is requested) it is a
 * no-op and reports `already_seeded`.
 */
export declare function reconcileManagedCodexHome(input: ReconcileManagedCodexHomeInput): Promise<ReconcileManagedCodexHomeResult>;
export type CodexCredentialAuthMode = "api" | "subscription";
export interface CodexCredentialReadinessInput {
    env?: NodeJS.ProcessEnv;
    companyId: string | undefined;
    /** `config.env.CODEX_HOME` for the run, if any. */
    configuredCodexHome: string | null | undefined;
    /** Resolved `config.env.OPENAI_API_KEY` value (after secret resolution). */
    configuredApiKey: string | null | undefined;
}
export interface CodexCredentialReadiness {
    /** True when Paperclip owns the effective home and is responsible for its auth. */
    managed: boolean;
    authMode: CodexCredentialAuthMode;
    /** True when a run launched now would be able to authenticate. */
    ready: boolean;
    effectiveHome: string;
    /** The shared source home subscription auth is symlinked from (managed homes only). */
    sharedSourceHome: string;
}
/**
 * Read-only predictor for whether a `codex_local` run will be able to
 * authenticate, without seeding or mutating any home. Mirrors the execute-time
 * fail-fast in `execute.ts`, factored out so the control plane can run the same
 * check *before* dispatch and surface a configuration-incomplete blocker instead
 * of dispatching a run that is guaranteed to fail with "no Codex credentials".
 *
 * - An external/user-supplied `CODEX_HOME` override manages its own auth, so it
 *   is always treated as ready (Paperclip must not seed or inspect it).
 * - A non-empty resolved `OPENAI_API_KEY` means API-key auth, always ready.
 * - Otherwise (subscription mode) the run needs a usable `auth.json`. Because a
 *   managed home symlinks `auth.json` from the shared source home at seed time,
 *   we treat the run as ready when either the (possibly already-seeded) effective
 *   home or the shared source home carries usable auth.
 */
export declare function evaluateCodexCredentialReadiness(input: CodexCredentialReadinessInput): Promise<CodexCredentialReadiness>;
//# sourceMappingURL=codex-home.d.ts.map