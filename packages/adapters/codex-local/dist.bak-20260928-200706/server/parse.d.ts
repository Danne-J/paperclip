export type CodexAuthRefreshFailureClass = "refresh_token_reused" | "refresh_token_expired" | "refresh_token_invalidated";
export declare function parseCodexJsonl(stdout: string): {
    sessionId: string | null;
    summary: string;
    usage: {
        inputTokens: number;
        cachedInputTokens: number;
        outputTokens: number;
    };
    usageBasis: "per_run";
    errorMessage: string | null;
    sawProtocolEvent: boolean;
    sawProtocolTerminalEvent: boolean;
};
/**
 * Structural crash detection: the codex CLI can only report an agent-level
 * failure through the JSONL protocol (an `error` event, `turn.failed`, or a
 * finished `turn.completed` followed by a nonzero exit). A nonzero exit after
 * the protocol stream started but before any terminal event means the process
 * died out from under the agent (MCP transport crash, worker panic, killed
 * tool server) — retriable infrastructure, not agent behavior. This
 * deliberately does not match error text: transport failure strings vary, and
 * stdout/stderr can quote agent output that merely discusses network errors.
 */
export declare function isCodexHarnessCrash(input: {
    exitCode: number | null;
    sawProtocolEvent: boolean;
    sawProtocolTerminalEvent: boolean;
}): boolean;
export declare function isCodexUnknownSessionError(stdout: string, stderr: string): boolean;
export declare function classifyCodexAuthRefreshFailure(input: {
    stdout?: string | null;
    stderr?: string | null;
    errorMessage?: string | null;
}): CodexAuthRefreshFailureClass | null;
export declare function extractCodexRetryNotBefore(input: {
    stdout?: string | null;
    stderr?: string | null;
    errorMessage?: string | null;
}, now?: Date): Date | null;
export declare function isCodexTransientUpstreamError(input: {
    stdout?: string | null;
    stderr?: string | null;
    errorMessage?: string | null;
}): boolean;
export declare function isCodexProviderQuotaError(input: {
    stdout?: string | null;
    stderr?: string | null;
    errorMessage?: string | null;
}): boolean;
//# sourceMappingURL=parse.d.ts.map