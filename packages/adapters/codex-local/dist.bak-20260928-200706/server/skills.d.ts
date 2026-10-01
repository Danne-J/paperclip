import type { AdapterSkillContext, AdapterSkillSnapshot } from "@paperclipai/adapter-utils";
export declare function listCodexSkills(ctx: AdapterSkillContext): Promise<AdapterSkillSnapshot>;
export declare function syncCodexSkills(ctx: AdapterSkillContext, _desiredSkills: string[]): Promise<AdapterSkillSnapshot>;
export declare function resolveCodexDesiredSkillNames(config: Record<string, unknown>, availableEntries: Array<{
    key: string;
    required?: boolean;
}>): string[];
//# sourceMappingURL=skills.d.ts.map