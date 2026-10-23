import { z } from "zod";
import type { Db } from "@paperclipai/db";
import { issues, projects, projectWorkspaces } from "@paperclipai/db";
import { and, eq } from "drizzle-orm";
import { canonicalizeRepositoryLocator, computeTargetFingerprint } from "./workspace-target-fingerprint.js";

/**
 * doc/execution-semantics.md, "Durable target and attestation schema".
 * Stored inline in existing JSON policy columns for now (no new migration):
 * issues.executionPolicy / projectWorkspaces.metadata / projects.executionWorkspacePolicy,
 * each under the `workspaceTargetDeclaration` key. The logical schema below
 * is the one that must eventually be normalized into tables.
 */
export const WORKSPACE_TARGET_DECLARATION_KIND = [
  "repository_checkout",
  "remote_operator_checkout",
  "artifact_only",
] as const;
export type WorkspaceTargetDeclarationKind = (typeof WORKSPACE_TARGET_DECLARATION_KIND)[number];

export const WORKSPACE_TARGET_DECLARATION_DELIVERY_METHOD = [
  "commit",
  "push",
  "pull_request",
  "remote_exec",
  "provider_sync",
  "operator_handoff",
  "controlled_sync",
  "none",
] as const;
export type WorkspaceTargetDeclarationDeliveryMethod =
  (typeof WORKSPACE_TARGET_DECLARATION_DELIVERY_METHOD)[number];

const workspaceTargetDeclarationSchema = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  companyId: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  projectWorkspaceId: z.string().min(1).nullable(),
  kind: z.enum(WORKSPACE_TARGET_DECLARATION_KIND),
  revision: z.number().int().nonnegative(),
  enabled: z.boolean(),
  deliveryRequired: z.boolean(),
  providerKey: z.string().min(1),
  repositoryFingerprint: z.string().min(1).nullable(),
  targetFingerprint: z.string().min(1),
  displayLabel: z.string(),
  privateTargetRef: z.string().min(1).nullable(),
  expectedRef: z.string().min(1).nullable(),
  deliveryMethod: z.enum(WORKSPACE_TARGET_DECLARATION_DELIVERY_METHOD),
  artifactClasses: z.array(z.enum(["issue_document", "attachment", "work_product"])),
});

export type WorkspaceTargetDeclarationV1 = z.infer<typeof workspaceTargetDeclarationSchema>;

export type WorkspaceTargetDeclarationSource = "issue_override" | "project_workspace" | "project_default";

export type WorkspaceTargetDeclarationRejectionReason =
  | "missing"
  | "disabled"
  | "cross_company"
  | "scope_mismatch"
  | "target_kind_incompatible"
  | "ambiguous"
  | "fingerprint_mismatch"
  | "target_ref_unresolved";

export type WorkspaceTargetDeclarationResolution =
  | { ok: true; declaration: WorkspaceTargetDeclarationV1; source: WorkspaceTargetDeclarationSource }
  | { ok: false; reason: WorkspaceTargetDeclarationRejectionReason; detail: string; source: WorkspaceTargetDeclarationSource | null };

/** Target kinds that can satisfy the `workspace_delivery` completion requirement. */
const DELIVERY_CAPABLE_KINDS: ReadonlySet<WorkspaceTargetDeclarationKind> = new Set([
  "repository_checkout",
  "remote_operator_checkout",
]);

function parseDeclaration(raw: unknown): WorkspaceTargetDeclarationV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = (raw as Record<string, unknown>).workspaceTargetDeclaration;
  if (!candidate) return null;
  const parsed = workspaceTargetDeclarationSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function recomputeTargetFingerprint(companyId: string, declaration: WorkspaceTargetDeclarationV1): string | null {
  if (!declaration.privateTargetRef) return null;
  const canonicalLocator = declaration.kind === "repository_checkout"
    ? canonicalizeRepositoryLocator(declaration.privateTargetRef)
    : declaration.privateTargetRef;
  return computeTargetFingerprint(companyId, declaration.providerKey, canonicalLocator);
}

/**
 * Validates one already-located candidate declaration against the company,
 * project, workspace, and completion-requirement context it must satisfy.
 * Does not consult lower-precedence tiers; the caller decides precedence.
 */
function validateCandidate(
  declaration: WorkspaceTargetDeclarationV1,
  source: WorkspaceTargetDeclarationSource,
  context: {
    companyId: string;
    projectId: string | null;
    projectWorkspaceId: string | null;
    completionRequirement: string | null;
  },
): WorkspaceTargetDeclarationResolution {
  if (declaration.companyId !== context.companyId) {
    return { ok: false, reason: "cross_company", detail: "declaration company does not match issue company", source };
  }
  if (declaration.projectId && context.projectId && declaration.projectId !== context.projectId) {
    return { ok: false, reason: "scope_mismatch", detail: "declaration project does not match issue project", source };
  }
  if (
    declaration.projectWorkspaceId
    && context.projectWorkspaceId
    && declaration.projectWorkspaceId !== context.projectWorkspaceId
  ) {
    return {
      ok: false,
      reason: "scope_mismatch",
      detail: "declaration project workspace does not match issue project workspace",
      source,
    };
  }
  if (!declaration.enabled) {
    return { ok: false, reason: "disabled", detail: `declaration ${declaration.id} is disabled`, source };
  }
  if (context.completionRequirement === "workspace_delivery" && !DELIVERY_CAPABLE_KINDS.has(declaration.kind)) {
    return {
      ok: false,
      reason: "target_kind_incompatible",
      detail: `declaration kind ${declaration.kind} cannot satisfy workspace_delivery`,
      source,
    };
  }
  if (declaration.kind !== "artifact_only" && !declaration.privateTargetRef) {
    return { ok: false, reason: "target_ref_unresolved", detail: `declaration ${declaration.id} has no target ref`, source };
  }
  if (declaration.kind !== "artifact_only") {
    const recomputed = recomputeTargetFingerprint(context.companyId, declaration);
    if (!recomputed || recomputed !== declaration.targetFingerprint) {
      return {
        ok: false,
        reason: "fingerprint_mismatch",
        detail: `declaration ${declaration.id} target fingerprint does not match its stored target ref`,
        source,
      };
    }
  }
  return { ok: true, declaration, source };
}

export interface ResolveWorkspaceTargetDeclarationInput {
  db: Db;
  companyId: string;
  issueId: string;
  projectId: string | null;
  projectWorkspaceId: string | null;
  completionRequirement: string | null;
}

/**
 * doc/execution-semantics.md, "Pre-dispatch validity": resolves the effective
 * declaration in precedence order (1) issue target override, (2) selected
 * project workspace target declaration, (3) project default target
 * declaration, and validates the first candidate found. A declaration found
 * at a given tier short-circuits lower tiers even if it fails validation —
 * the operator must fix or clear it, not fall back silently to a weaker tier.
 */
export async function resolveWorkspaceTargetDeclaration(
  input: ResolveWorkspaceTargetDeclarationInput,
): Promise<WorkspaceTargetDeclarationResolution> {
  const context = {
    companyId: input.companyId,
    projectId: input.projectId,
    projectWorkspaceId: input.projectWorkspaceId,
    completionRequirement: input.completionRequirement,
  };

  const issueRow = await input.db
    .select({ executionPolicy: issues.executionPolicy })
    .from(issues)
    .where(and(eq(issues.id, input.issueId), eq(issues.companyId, input.companyId)))
    .then((rows) => rows[0] ?? null);
  const issueOverride = issueRow ? parseDeclaration(issueRow.executionPolicy) : null;
  if (issueOverride) {
    return validateCandidate(issueOverride, "issue_override", context);
  }

  if (input.projectWorkspaceId) {
    const workspaceRow = await input.db
      .select({ metadata: projectWorkspaces.metadata })
      .from(projectWorkspaces)
      .where(
        and(
          eq(projectWorkspaces.id, input.projectWorkspaceId),
          eq(projectWorkspaces.companyId, input.companyId),
        ),
      )
      .then((rows) => rows[0] ?? null);
    const workspaceDeclaration = workspaceRow ? parseDeclaration(workspaceRow.metadata) : null;
    if (workspaceDeclaration) {
      return validateCandidate(workspaceDeclaration, "project_workspace", context);
    }
  }

  if (input.projectId) {
    const projectRow = await input.db
      .select({ executionWorkspacePolicy: projects.executionWorkspacePolicy })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.companyId, input.companyId)))
      .then((rows) => rows[0] ?? null);
    const projectDefault = projectRow ? parseDeclaration(projectRow.executionWorkspacePolicy) : null;
    if (projectDefault) {
      return validateCandidate(projectDefault, "project_default", context);
    }
  }

  return {
    ok: false,
    reason: "missing",
    detail: "no workspace target declaration found at issue override, project workspace, or project default tier",
    source: null,
  };
}

/**
 * doc/execution-semantics.md, "Pre-dispatch validity": recovery-action
 * fingerprint for a failed resolution, so reconciliation does not retry the
 * gate while nothing about the target or requirement has changed.
 */
export function workspaceTargetDeclarationRecoveryFingerprint(input: {
  issueId: string;
  completionRequirementRevision: number;
  declarationRevision: number | null;
}): string {
  const revisionPart = input.declarationRevision ?? "missing";
  return `workspace_target:${input.issueId}:${input.completionRequirementRevision}:${revisionPart}`;
}
