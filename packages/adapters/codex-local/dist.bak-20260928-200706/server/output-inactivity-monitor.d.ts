export declare const DEFAULT_CODEX_OUTPUT_INACTIVITY_TIMEOUT_MS: number;
export declare const CODEX_OUTPUT_INACTIVITY_MONITOR_SIGTERM_GRACE_MS = 5000;
export type CodexOutputInactivityMonitorResolution = {
    mode: "default";
    timeoutMs: number;
} | {
    mode: "configured";
    timeoutMs: number;
} | {
    mode: "disabled";
    reason: "explicit_null";
} | {
    mode: "default";
    timeoutMs: number;
    reason: "non_positive";
};
/**
 * Resolve the inactivity monitor timeout from raw adapter config.
 *
 * - `null`         → disabled (explicit escape hatch).
 * - missing/`undefined` → default 30m.
 * - number > 0     → configured value.
 * - number ≤ 0     → default 30m (and a `non_positive` note for logging).
 */
export declare function resolveCodexInactivityTimeout(rawValue: unknown): CodexOutputInactivityMonitorResolution;
export interface CodexOutputInactivityMonitorState {
    fired: boolean;
    spawnedAt: number;
    lastEventAt: number;
    firedAt: number | null;
    outputChunkCount: number;
    outputBytes: number;
    parsedEventCount: number;
    processActivityCount: number;
}
export interface CodexOutputInactivityMonitorOptions {
    timeoutMs: number;
    onFire: (state: CodexOutputInactivityMonitorState) => void;
    now?: () => number;
    setTimer?: (cb: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
    /**
     * Per-line predicate. When omitted, any line that successfully parses as
     * JSON via the codex JSONL parser counts as a heartbeat event.
     */
    isHeartbeatLine?: (line: string) => boolean;
}
export interface CodexOutputInactivityMonitorHandle {
    noteOutputChunk(stream: "stdout" | "stderr", chunk: string): void;
    noteProcessActivity(): void;
    /** Returns the current state without stopping the timer. */
    state(): CodexOutputInactivityMonitorState;
    /** Cancels any pending timer and returns the final state. */
    stop(): CodexOutputInactivityMonitorState;
}
export declare function createCodexOutputInactivityMonitor(options: CodexOutputInactivityMonitorOptions): CodexOutputInactivityMonitorHandle;
/**
 * Format the inactivity monitor error message in the canonical
 * `monitor: no codex activity (output or process) for {N}m {S}s` shape consumed by NEE-81.
 */
export declare function formatOutputInactivityMonitorErrorMessage(elapsedMs: number): string;
//# sourceMappingURL=output-inactivity-monitor.d.ts.map