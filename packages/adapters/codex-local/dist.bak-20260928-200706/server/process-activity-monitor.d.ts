export declare const CODEX_PROCESS_ACTIVITY_POLL_INTERVAL_MS = 15000;
export interface CodexProcessActivitySnapshot {
    cpuTicks: number;
    ioBytes: number;
    processIds: string;
}
export interface CodexProcessActivityMonitorOptions {
    pid: number;
    processGroupId: number | null;
    onActivity: () => void;
    intervalMs?: number;
    sample?: () => Promise<CodexProcessActivitySnapshot | null>;
    setTimer?: (cb: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
}
export interface CodexProcessActivityMonitorHandle {
    stop(): void;
}
export declare function sampleCodexProcessActivity(pid: number, processGroupId: number | null): Promise<CodexProcessActivitySnapshot | null>;
export declare function createCodexProcessActivityMonitor(options: CodexProcessActivityMonitorOptions): CodexProcessActivityMonitorHandle;
//# sourceMappingURL=process-activity-monitor.d.ts.map