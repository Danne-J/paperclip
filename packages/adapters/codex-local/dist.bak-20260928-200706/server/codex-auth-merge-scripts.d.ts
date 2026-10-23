import type { SandboxManagedRuntimeAssetProvision } from "@paperclipai/adapter-utils/sandbox-managed-runtime";
export declare const CODEX_AUTH_MERGE_EXTRACT_SCRIPT_NAME = "codex-auth-merge-extract.sh";
export declare const CODEX_AUTH_MERGE_DECISION_SCRIPT_NAME = "codex-auth-merge-decision.cjs";
/**
 * Builds the inbound (host→sandbox) provisioning contribution for the Codex
 * managed-home asset as **files + an ordered post-upload merge command**: the two
 * merge scripts ride the sync operation's `files` (staged into the runtime root
 * alongside the uploaded home tar via native `uploadFiles`), and the merge-extract
 * script runs as the operation's ordered **post-upload command** instead of a
 * plain `tar -xf`, so a sandbox that already carries a Codex `auth.json` keeps
 * whichever credential is newer (newer-`auth.json`-wins, same-identity, atomic
 * `0600` install — all inside the opaque script, unchanged).
 *
 * The command string handed to the provider is opaque and fully shell-quoted from
 * already-confined paths (Security Conditions C1/C3): it invokes only the staged
 * script by path — no `auth.json` bytes, token fields, or workspace content are
 * interpolated into the shell (C5). This is behaviour-identical to the extraction
 * the sandbox core previously drove through the custom-provision tar path.
 */
export declare function buildCodexAuthInboundProvision(): SandboxManagedRuntimeAssetProvision;
//# sourceMappingURL=codex-auth-merge-scripts.d.ts.map