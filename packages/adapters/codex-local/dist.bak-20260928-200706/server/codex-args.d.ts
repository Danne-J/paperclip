export type BuildCodexExecArgsResult = {
    args: string[];
    model: string;
    fastModeRequested: boolean;
    fastModeApplied: boolean;
    fastModeIgnoredReason: string | null;
};
export declare function buildCodexExecArgs(config: unknown, options?: {
    resumeSessionId?: string | null;
    skipGitRepoCheck?: boolean;
}): BuildCodexExecArgsResult;
//# sourceMappingURL=codex-args.d.ts.map