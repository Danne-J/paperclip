export declare const MAX_AUTH_JSON_BYTES: number;
export type InstallDeviceLoginOutcome = "seeded" | "updated" | "kept";
/**
 * Resolves the company-scoped proof-home root under the same isolation boundary
 * as the managed Codex home. The root is always company-scoped, so a proof home
 * can never cross a company boundary. `companyId` is required and is sanitized to
 * a single safe path segment.
 */
export declare function resolveProofHomeRoot(env: NodeJS.ProcessEnv | undefined, companyId: string): string;
export interface DeriveProofHomeInput {
    env?: NodeJS.ProcessEnv;
    companyId?: string;
    runId?: string;
}
/**
 * Returns a unique, run-scoped proof-home path under the company-scoped root.
 * The path carries the run id and a fresh random suffix, so two calls never
 * collide and every proof home is tied to its run.
 */
export declare function deriveProofHome(input?: DeriveProofHomeInput): string;
/**
 * Enforces the bounded-size, subscription-only auth shape. Rejects an empty, an
 * oversized, an API-key, and a malformed payload. Never puts token bytes into the
 * error. The device-login promotion reuses this exact rule, so the export and the
 * promotion validate the same way.
 */
export declare function assertUsableSubscriptionShape(bytes: Buffer): void;
export interface InstallDeviceLoginCredentialInput {
    /** The sandbox `auth.json` bytes read back from the login sandbox. */
    sandboxAuthBytes: Buffer;
    /** The run-scoped proof home from {@link deriveProofHome}. */
    proofHome: string;
    /** A non-leaking progress sink. It receives only fixed status lines. */
    log: (line: string) => void | Promise<void>;
    env?: NodeJS.ProcessEnv;
    companyId?: string;
}
/**
 * Installs the sandbox credential into the run-scoped proof home. Seeds an empty
 * home. Applies a strictly-newer, same-identity update to a non-empty home.
 * Keeps the home otherwise. Enforces Control 2 before any write: the target
 * safety guard, the auth-shape gate, and the path-safety guard all run first.
 * Never logs token bytes.
 */
export declare function installDeviceLoginCredential(input: InstallDeviceLoginCredentialInput): Promise<InstallDeviceLoginOutcome>;
export interface RemoveProofHomeInput {
    env?: NodeJS.ProcessEnv;
    companyId?: string;
}
/**
 * Removes the proof home. Refuses a path outside the company-scoped proof root,
 * so a cleanup can never delete the shared, the default, or a managed home. A
 * missing proof home is a benign no-op.
 */
export declare function removeProofHome(proofHome: string, input?: RemoveProofHomeInput): Promise<void>;
//# sourceMappingURL=device-login-export.d.ts.map