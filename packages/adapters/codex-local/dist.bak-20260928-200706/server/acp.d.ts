import type { AdapterBillingType, AdapterEnvironmentTestContext, AdapterEnvironmentTestResult, AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import type { AcpxEngineExecutorOptions } from "@paperclipai/adapter-utils/acpx-engine/execute";
export type CodexExecutionEngine = "cli" | "acp";
export interface CodexEngineSelection {
    engine: CodexExecutionEngine;
    explicit: boolean;
    fallbackReason?: string;
}
type CodexEngineResolutionInput = Pick<AdapterExecutionContext, "config"> & Partial<Pick<AdapterExecutionContext, "executionTarget" | "executionTransport">>;
type CodexAcpExecutorOptions = Omit<AcpxEngineExecutorOptions, "adapterType" | "moduleDir" | "packageRootDir">;
type CodexAcpExecutor = (ctx: AdapterExecutionContext) => Promise<AdapterExecutionResult>;
export declare function resolveCodexExecutionEngine(config: Record<string, unknown>): CodexEngineSelection;
export declare function resolveCodexExecutionEngineForRun(input: CodexEngineResolutionInput): Promise<CodexEngineSelection>;
export declare function formatCodexAcpFallbackMessage(reason: string): string;
export declare function buildCodexAcpConfig(config: Record<string, unknown>): Record<string, unknown>;
/**
 * Classify billing the same way the Codex CLI lane does so ACP runs land in
 * the cost ledger with a real provider/billingType instead of acpx/unknown.
 * Host env only counts for local execution targets; remote targets see just
 * the adapter-config env.
 */
export declare function resolveCodexAcpBillingIdentity(ctx: Pick<AdapterExecutionContext, "config"> & Partial<Pick<AdapterExecutionContext, "executionTarget" | "executionTransport">>): {
    provider: string;
    biller: string;
    billingType: AdapterBillingType;
};
export declare function createCodexAcpExecutor(options?: CodexAcpExecutorOptions): CodexAcpExecutor;
export declare function nodeVersionMeetsCodexAcpMinimum(version?: string): boolean;
export declare function testCodexAcpEnvironment(ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult>;
export {};
//# sourceMappingURL=acp.d.ts.map