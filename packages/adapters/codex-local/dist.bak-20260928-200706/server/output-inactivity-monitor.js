import { parseJson } from "@paperclipai/adapter-utils/server-utils";
export const DEFAULT_CODEX_OUTPUT_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
export const CODEX_OUTPUT_INACTIVITY_MONITOR_SIGTERM_GRACE_MS = 5_000;
/**
 * Resolve the inactivity monitor timeout from raw adapter config.
 *
 * - `null`         → disabled (explicit escape hatch).
 * - missing/`undefined` → default 30m.
 * - number > 0     → configured value.
 * - number ≤ 0     → default 30m (and a `non_positive` note for logging).
 */
export function resolveCodexInactivityTimeout(rawValue) {
    if (rawValue === null)
        return { mode: "disabled", reason: "explicit_null" };
    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        if (rawValue > 0)
            return { mode: "configured", timeoutMs: rawValue };
        return { mode: "default", timeoutMs: DEFAULT_CODEX_OUTPUT_INACTIVITY_TIMEOUT_MS, reason: "non_positive" };
    }
    return { mode: "default", timeoutMs: DEFAULT_CODEX_OUTPUT_INACTIVITY_TIMEOUT_MS };
}
function defaultIsHeartbeatLine(line) {
    const trimmed = line.trim();
    if (!trimmed)
        return false;
    return parseJson(trimmed) !== null;
}
export function createCodexOutputInactivityMonitor(options) {
    const now = options.now ?? (() => Date.now());
    const setTimer = options.setTimer ?? ((cb, ms) => setTimeout(cb, ms));
    const clearTimer = options.clearTimer ?? ((h) => clearTimeout(h));
    const isHeartbeatLine = options.isHeartbeatLine ?? defaultIsHeartbeatLine;
    const timeoutMs = options.timeoutMs;
    if (!(timeoutMs > 0)) {
        throw new Error(`createCodexOutputInactivityMonitor requires timeoutMs > 0 (got ${timeoutMs})`);
    }
    const spawnedAt = now();
    const state = {
        fired: false,
        spawnedAt,
        lastEventAt: spawnedAt,
        firedAt: null,
        outputChunkCount: 0,
        outputBytes: 0,
        parsedEventCount: 0,
        processActivityCount: 0,
    };
    let timerHandle = null;
    let stopped = false;
    const fire = () => {
        if (state.fired || stopped)
            return;
        state.fired = true;
        state.firedAt = now();
        timerHandle = null;
        options.onFire({ ...state });
    };
    const arm = () => {
        if (stopped || state.fired)
            return;
        if (timerHandle != null)
            clearTimer(timerHandle);
        timerHandle = setTimer(fire, timeoutMs);
    };
    arm();
    return {
        noteOutputChunk(stream, chunk) {
            if (stopped || state.fired || chunk.length === 0)
                return;
            state.outputChunkCount += 1;
            state.outputBytes += Buffer.byteLength(chunk, "utf8");
            if (stream === "stdout") {
                for (const rawLine of chunk.split(/\r?\n/)) {
                    if (isHeartbeatLine(rawLine)) {
                        state.parsedEventCount += 1;
                    }
                }
            }
            state.lastEventAt = now();
            arm();
        },
        noteProcessActivity() {
            if (stopped || state.fired)
                return;
            state.processActivityCount += 1;
            state.lastEventAt = now();
            arm();
        },
        state() {
            return { ...state };
        },
        stop() {
            stopped = true;
            if (timerHandle != null) {
                clearTimer(timerHandle);
                timerHandle = null;
            }
            return { ...state };
        },
    };
}
/**
 * Format the inactivity monitor error message in the canonical
 * `monitor: no codex activity (output or process) for {N}m {S}s` shape consumed by NEE-81.
 */
export function formatOutputInactivityMonitorErrorMessage(elapsedMs) {
    const total = Math.max(0, Math.round(elapsedMs / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total - minutes * 60;
    return `monitor: no codex activity (output or process) for ${minutes}m ${seconds}s`;
}
//# sourceMappingURL=output-inactivity-monitor.js.map