export type WriteCredentialSeedOrNewerOutcome = "written" | "kept";
export interface WriteCredentialSeedOrNewerInput {
    /** The source credential bytes to (maybe) install. */
    sourceBytes: Buffer;
    /** The absolute destination path to (maybe) overwrite. */
    destinationPath: string;
    /** Fill an absent destination from a usable subscription source. */
    seedIfDestAbsent: boolean;
    /** A non-leaking progress sink. It receives only the two fixed status lines. */
    log: (line: string) => void | Promise<void>;
    /** The fixed status line for a use-source write. It carries no secret data. */
    writtenLine: string;
    /** The fixed status line for a keep-destination decision. */
    keptLine: string;
    /** A safe, non-secret prefix for the staged temp file name. */
    tempPrefix: string;
    /** The caller name that prefixes a predicate error. */
    errorLabel: string;
    /** Environment for the merge lock root. Defaults to `process.env`. */
    env?: NodeJS.ProcessEnv;
}
/**
 * Writes `sourceBytes` over `destinationPath` when the shared predicate returns a
 * use-source decision, else keeps the destination. Seeds an absent destination
 * only when `seedIfDestAbsent` is set and the source is a usable subscription
 * credential. The staged temp is always removed, so a failure never leaves a
 * partial file.
 */
export declare function writeCredentialSeedOrNewer(input: WriteCredentialSeedOrNewerInput): Promise<WriteCredentialSeedOrNewerOutcome>;
//# sourceMappingURL=codex-auth-seed-write.d.ts.map