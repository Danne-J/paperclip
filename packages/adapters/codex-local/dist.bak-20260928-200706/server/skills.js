import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRuntimeMountedSkillSnapshot, readPaperclipRuntimeSkillEntries, resolveLegacyPaperclipDesiredSkillNames, resolvePaperclipDesiredSkillNames, } from "@paperclipai/adapter-utils/server-utils";
const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
async function buildCodexSkillSnapshot(config, adapterType) {
    const availableEntries = await readPaperclipRuntimeSkillEntries(config, __moduleDir);
    const desiredSkills = adapterType === "paperclip_runner"
        ? resolvePaperclipDesiredSkillNames(config, availableEntries)
        : resolveLegacyPaperclipDesiredSkillNames(config, availableEntries);
    return buildRuntimeMountedSkillSnapshot({
        adapterType,
        availableEntries,
        desiredSkills,
        configuredDetail: "Will be linked into the effective CODEX_HOME/skills/ directory on the next run.",
    });
}
export async function listCodexSkills(ctx) {
    return buildCodexSkillSnapshot(ctx.config, ctx.adapterType);
}
export async function syncCodexSkills(ctx, _desiredSkills) {
    return buildCodexSkillSnapshot(ctx.config, ctx.adapterType);
}
export function resolveCodexDesiredSkillNames(config, availableEntries) {
    return resolveLegacyPaperclipDesiredSkillNames(config, availableEntries);
}
//# sourceMappingURL=skills.js.map