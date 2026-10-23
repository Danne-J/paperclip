import { type AdapterExecutionContext, type AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { readAdapterExecutionTarget } from "@paperclipai/adapter-utils/execution-target";
export declare function firstMeaningfulStderrLine(text: string): string;
type EnsureCodexSkillsInjectedOptions = {
    skillsHome?: string;
    skillsEntries?: Array<{
        key: string;
        runtimeName: string;
        source: string;
    }>;
    desiredSkillNames?: string[];
    linkSkill?: (source: string, target: string) => Promise<void>;
};
type ResolvedExecutionTarget = ReturnType<typeof readAdapterExecutionTarget>;
type MaybeResolvedExecutionTarget = ResolvedExecutionTarget | undefined;
/**
 * Execute-time credential gate. A managed home with no host-side credentials
 * is still launchable when the run targets a sandbox whose image carries its
 * own Codex login (`~/.codex/auth.json` baked in during image setup): the
 * inbound auth merge ships the credential-less host home and keeps the
 * sandbox's credential, so the host is not a required credential source —
 * on managed cloud hosts a local Codex login never exists at all. The
 * sandbox is probed before the run is declared unlaunchable; non-sandbox
 * targets keep the strict host-side requirement.
 */
export declare function assertCodexCredentialsLaunchable(input: {
    runId: string;
    companyId: string;
    configuredCodexHome: string | null;
    configuredApiKey: string | null;
    effectiveCodexHome: string;
    target: MaybeResolvedExecutionTarget;
    cwd: string;
    env?: NodeJS.ProcessEnv;
    onLog: AdapterExecutionContext["onLog"];
}): Promise<void>;
export declare function ensureCodexSkillsInjected(onLog: AdapterExecutionContext["onLog"], options?: EnsureCodexSkillsInjectedOptions): Promise<void>;
export declare function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult>;
export {};
//# sourceMappingURL=execute.d.ts.map