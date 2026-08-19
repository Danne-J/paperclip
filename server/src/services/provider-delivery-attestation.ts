import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import type { Db } from "@paperclipai/db";
import { deliveryAttestationService } from "./delivery-attestations.js";
import { canonicalizeRepositoryLocator, computeTargetFingerprint } from "./workspace-target-fingerprint.js";

const execFile = promisify(execFileCallback);

export type GitInspection = {
  cwd: string; repoUrl: string | null; ref: string | null; sourceRevision: string | null;
  deliveredRevision: string | null; workspaceDirty: boolean | null;
  outcome: "succeeded" | "failed"; deliveryMethod: "commit" | "push" | "none"; error: string | null;
};

async function git(cwd: string, args: string[]) {
  const result = await execFile("git", ["-C", cwd, ...args], { maxBuffer: 256 * 1024 });
  return result.stdout.trim();
}

/** Inspect provider state; agent-authored evidence is never consulted. */
export async function inspectGitDelivery(input: { cwd: string; repoUrl: string | null; repoRef: string | null }): Promise<GitInspection> {
  const result: GitInspection = { cwd: input.cwd, repoUrl: input.repoUrl, ref: input.repoRef, sourceRevision: null, deliveredRevision: null, workspaceDirty: null, outcome: "failed", deliveryMethod: "none", error: null };
  try {
    const [sourceRevision, status] = await Promise.all([git(input.cwd, ["rev-parse", "HEAD"]), git(input.cwd, ["status", "--porcelain", "--untracked-files=normal"])]);
    result.sourceRevision = sourceRevision || null;
    result.workspaceDirty = status.length > 0;
    if (!sourceRevision) throw new Error("provider checkout has no HEAD revision");
    if (result.workspaceDirty) throw new Error("provider checkout is dirty");
    if (input.repoUrl && input.repoRef) {
      const remoteRef = input.repoRef.startsWith("refs/") ? input.repoRef : `refs/heads/${input.repoRef}`;
      const remoteOutput = await git(input.cwd, ["ls-remote", input.repoUrl, remoteRef]);
      result.deliveredRevision = remoteOutput.split(/\s+/)[0] || null;
      if (result.deliveredRevision !== sourceRevision) throw new Error(`remote ${remoteRef} does not contain checkout revision`);
      result.outcome = "succeeded"; result.deliveryMethod = "push"; return result;
    }
    result.deliveredRevision = sourceRevision; result.outcome = "succeeded"; result.deliveryMethod = "commit"; return result;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

export async function recordProviderDeliveryAttestation(input: {
  db: Db; companyId: string; issueId: string; runId: string; declarationId: string; declarationRevision: number;
  targetFingerprint: string; cwd: string; repoUrl: string | null; repoRef: string | null;
}) {
  const inspection = await inspectGitDelivery(input);
  const target = input.repoUrl ? canonicalizeRepositoryLocator(input.repoUrl) : input.cwd;
  const attestation = await deliveryAttestationService(input.db).record({
    companyId: input.companyId, issueId: input.issueId, runId: input.runId, declarationId: input.declarationId,
    declarationRevision: input.declarationRevision, targetKind: "repository_checkout",
    targetFingerprint: input.targetFingerprint || computeTargetFingerprint(input.companyId, "git", target), providerKey: "git",
    outcome: inspection.outcome, deliveryMethod: inspection.deliveryMethod, sourceRevision: inspection.sourceRevision,
    deliveredRevision: inspection.deliveredRevision,
    destinationRefFingerprint: input.repoRef ? computeTargetFingerprint(input.companyId, "git-ref", input.repoRef) : null,
    workspaceDirty: inspection.workspaceDirty,
    artifactIds: [],
    operationId: `git:${input.runId}:${inspection.sourceRevision ?? "unknown"}:${input.repoRef ?? "HEAD"}`,
  });
  return { attestation, inspection };
}
