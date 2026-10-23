import { open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { withDirectoryMergeLock } from "@paperclipai/adapter-utils/workspace-restore-merge";
import { USE_SOURCE_EXIT, decideCodexAuthMerge } from "./codex-auth-merge-decision.js";
/**
 * Writes `sourceBytes` over `destinationPath` when the shared predicate returns a
 * use-source decision, else keeps the destination. Seeds an absent destination
 * only when `seedIfDestAbsent` is set and the source is a usable subscription
 * credential. The staged temp is always removed, so a failure never leaves a
 * partial file.
 */
export async function writeCredentialSeedOrNewer(input) {
    const destinationDir = path.dirname(input.destinationPath);
    return withDirectoryMergeLock(destinationDir, async () => {
        const stagedTempPath = path.join(destinationDir, `.${input.tempPrefix}-${process.pid}-${randomUUID()}.tmp`);
        // `wx` + explicit mode create the temp private (0600) and fail if it already
        // exists, so the writer never writes through a pre-existing symlink.
        const handle = await open(stagedTempPath, "wx", 0o600);
        try {
            await handle.writeFile(input.sourceBytes);
            await handle.close();
            const decision = await decideCodexAuthMerge(stagedTempPath, input.destinationPath, {
                seedIfDestAbsent: input.seedIfDestAbsent,
                errorLabel: input.errorLabel,
            });
            if (decision === USE_SOURCE_EXIT) {
                await rename(stagedTempPath, input.destinationPath);
                await input.log(input.writtenLine);
                return "written";
            }
            await input.log(input.keptLine);
            return "kept";
        }
        finally {
            await handle.close().catch(() => undefined);
            await rm(stagedTempPath, { force: true }).catch(() => undefined);
        }
    }, input.env);
}
//# sourceMappingURL=codex-auth-seed-write.js.map