import { describe, expect, it, vi } from "vitest";
import { createCodexProcessActivityMonitor, } from "./process-activity-monitor.js";
class PollHarness {
    callback = null;
    setTimer = (callback) => {
        this.callback = callback;
        return callback;
    };
    clearTimer = () => {
        this.callback = null;
    };
    async poll() {
        await vi.waitFor(() => expect(this.callback).not.toBeNull());
        const callback = this.callback;
        this.callback = null;
        callback?.();
    }
}
function snapshot(cpuTicks, ioBytes, processIds = "100") {
    return { cpuTicks, ioBytes, processIds };
}
describe("createCodexProcessActivityMonitor", () => {
    it("requires a baseline and ignores sub-threshold CPU changes", async () => {
        const samples = [snapshot(100, 1_000), snapshot(114, 1_000)];
        const harness = new PollHarness();
        const onActivity = vi.fn();
        const monitor = createCodexProcessActivityMonitor({
            pid: 100,
            processGroupId: 100,
            intervalMs: 15_000,
            sample: async () => samples.shift() ?? null,
            setTimer: harness.setTimer,
            clearTimer: harness.clearTimer,
            onActivity,
        });
        await harness.poll();
        await vi.waitFor(() => expect(onActivity).not.toHaveBeenCalled());
        monitor.stop();
    });
    it.each([
        ["CPU growth", snapshot(115, 1_000)],
        ["I/O growth", snapshot(100, 1_001)],
        ["process-group churn", snapshot(100, 1_000, "100,101")],
    ])("reports %s as process activity", async (_label, activeSnapshot) => {
        const samples = [snapshot(100, 1_000), activeSnapshot];
        const harness = new PollHarness();
        const onActivity = vi.fn();
        const monitor = createCodexProcessActivityMonitor({
            pid: 100,
            processGroupId: 100,
            intervalMs: 15_000,
            sample: async () => samples.shift() ?? null,
            setTimer: harness.setTimer,
            clearTimer: harness.clearTimer,
            onActivity,
        });
        await harness.poll();
        await vi.waitFor(() => expect(onActivity).toHaveBeenCalledTimes(1));
        monitor.stop();
    });
    it("resets its comparison baseline after an unavailable sample", async () => {
        const samples = [snapshot(100, 1_000), null, snapshot(200, 2_000), snapshot(215, 2_000)];
        const harness = new PollHarness();
        const onActivity = vi.fn();
        const monitor = createCodexProcessActivityMonitor({
            pid: 100,
            processGroupId: 100,
            intervalMs: 15_000,
            sample: async () => samples.shift() ?? null,
            setTimer: harness.setTimer,
            clearTimer: harness.clearTimer,
            onActivity,
        });
        await harness.poll();
        await harness.poll();
        await vi.waitFor(() => expect(onActivity).not.toHaveBeenCalled());
        await harness.poll();
        await vi.waitFor(() => expect(onActivity).toHaveBeenCalledTimes(1));
        monitor.stop();
    });
});
//# sourceMappingURL=process-activity-monitor.test.js.map