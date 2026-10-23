/** Exit code: install the source credential over the destination. */
export declare const USE_SOURCE_EXIT = 10;
/** Exit code: keep the destination credential. */
export declare const KEEP_DESTINATION_EXIT = 20;
export interface DecideCodexAuthMergeOptions {
    /** Opt in to the cache-slot seed mode: fill an absent destination from a
     *  usable subscription source. */
    seedIfDestAbsent?: boolean;
    /** The caller name that prefixes a predicate error, for example
     *  `codex auth cache`. */
    errorLabel: string;
}
/**
 * Runs the shared decision predicate and returns its exit code (10 or 20). A
 * non-10/20 exit, or a failure to run `node`, is a hard failure: this throws so a
 * broken predicate is never mistaken for a "keep destination" decision.
 */
export declare function decideCodexAuthMerge(sourcePath: string, destinationPath: string, options: DecideCodexAuthMergeOptions): Promise<number>;
//# sourceMappingURL=codex-auth-merge-decision.d.ts.map