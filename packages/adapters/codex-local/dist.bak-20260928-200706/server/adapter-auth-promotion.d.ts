/** The independent readiness result for the exact staged credential. */
export interface CredentialReadinessResult {
    /** True when a run launched now with this exact credential would authenticate. */
    ready: boolean;
    /** An optional non-secret reason code for a non-ready result. */
    reason?: string;
}
/** Thrown when the independent readiness check does not return a ready result.
 *  The service maps this to a failed session and still deletes the sandbox. */
export declare class DeviceLoginReadinessError extends Error {
    readonly reason: string;
    constructor(reason: string);
}
/**
 * The independent readiness check for a staged device-login credential. It runs
 * on the exact staged bytes, before any promotion write. It writes the bytes to
 * a throwaway private home and runs the same usable-auth predicate the execute
 * path uses. It always removes the throwaway home before it returns.
 *
 * A ready result means a run launched now with this exact credential would
 * authenticate. A non-ready result rejects the promotion, and the caller writes
 * nothing. The function reads and writes no company scope and logs no bytes.
 */
export declare function checkStagedCredentialReadiness(authBytes: Buffer): Promise<CredentialReadinessResult>;
/**
 * The promotion outcome.
 *
 * - `promoted`: the helper wrote the company home (a seed or a strictly-newer
 *   same-identity update). The helper then tries the per-identity cache slot when
 *   the cache is on. The cache write is best-effort: a cache failure keeps the
 *   `promoted` outcome, because the company home is already durable.
 * - `kept`: the login carried the SAME identity as the company home, and the home
 *   already held a newer same-identity credential, so the home was kept. This is a
 *   successful authentication: a later run vends and uses the same account. The
 *   helper still tries the best-effort cache write.
 * - `kept_foreign_identity`: the login carried a DIFFERENT identity than the
 *   company home. The helper never clobbers an occupied home, so it kept the other
 *   account and installed nothing durable for this login. The identity-anchored
 *   vend reads the home identity first, so a later run can never select this
 *   login. This is NOT a successful authentication; the caller must fail the
 *   session instead of a report of `authenticated`.
 * - `not_sole_owner`: Decision H rejected the write. Nothing was written.
 * - `background_skipped`: Decision C rejected the write (an automatic background
 *   path never seeds a company slot). Nothing was written.
 */
export type PromoteDeviceLoginCredentialOutcome = "promoted" | "kept" | "kept_foreign_identity" | "not_sole_owner" | "background_skipped";
export interface PromoteDeviceLoginCredentialInput {
    /** The exact staged credential bytes the login sandbox produced. */
    authBytes: Buffer;
    /** The company that owns this login. It must be a single safe path segment. */
    companyId: string;
    /**
     * True when a user started this login. Decision C: only a user-initiated login
     * seeds the company slot. An automatic background path never seeds it.
     */
    userInitiated: boolean;
    /**
     * The independent, machine-readable readiness check. It runs on the exact
     * staged credential with the normal execution precedence, before any write. A
     * non-ready result rejects the promotion (the session fails), and the helper
     * writes nothing.
     */
    checkReadiness: (authBytes: Buffer) => Promise<CredentialReadinessResult> | CredentialReadinessResult;
    /**
     * Decision H: resolves true only while this session still holds the sole active
     * claim on `(company_id, adapter_type)` (the internal `promoting` state). The
     * helper writes only when it resolves true.
     */
    isSoleActiveOwner: () => Promise<boolean> | boolean;
    /** A non-leaking progress sink. It receives only fixed status lines. */
    log: (line: string) => void | Promise<void>;
    env?: NodeJS.ProcessEnv;
}
/**
 * Promotes a device-login credential into the company scope. The order is fixed:
 * readiness check, credential validation, Decision C, Decision H, then the writes.
 * The readiness check and the writes run while the caller still holds the active
 * claim, so a second session cannot race the same slot.
 */
export declare function promoteDeviceLoginCredential(input: PromoteDeviceLoginCredentialInput): Promise<PromoteDeviceLoginCredentialOutcome>;
//# sourceMappingURL=adapter-auth-promotion.d.ts.map