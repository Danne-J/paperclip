import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  companies,
  createDb,
  issues,
  projects,
  projectWorkspaces,
} from "@paperclipai/db";
import {
  getEmbeddedPostgresTestSupport,
  startEmbeddedPostgresTestDatabase,
} from "./helpers/embedded-postgres.js";
import { resolveWorkspaceTargetDeclaration, type WorkspaceTargetDeclarationV1 } from "../services/workspace-target-declaration.js";
import { canonicalizeRepositoryLocator, computeTargetFingerprint } from "../services/workspace-target-fingerprint.js";

const embeddedPostgresSupport = await getEmbeddedPostgresTestSupport();
const describeEmbeddedPostgres = embeddedPostgresSupport.supported ? describe : describe.skip;

if (!embeddedPostgresSupport.supported) {
  console.warn(
    `Skipping embedded Postgres workspace target declaration tests on this host: ${embeddedPostgresSupport.reason ?? "unsupported environment"}`,
  );
}

process.env.PAPERCLIP_AGENT_JWT_SECRET ??= "test-secret-for-workspace-target-declaration";

describeEmbeddedPostgres("resolveWorkspaceTargetDeclaration", () => {
  let db!: ReturnType<typeof createDb>;
  let tempDb: Awaited<ReturnType<typeof startEmbeddedPostgresTestDatabase>> | null = null;

  beforeAll(async () => {
    tempDb = await startEmbeddedPostgresTestDatabase("paperclip-workspace-target-declaration-");
    db = createDb(tempDb.connectionString);
  }, 20_000);

  afterEach(async () => {
    await db.delete(issues);
    await db.delete(projectWorkspaces);
    await db.delete(projects);
    await db.delete(companies);
  });

  afterAll(async () => {
    await tempDb?.cleanup();
  });

  let companyId: string;
  let projectId: string;
  let projectWorkspaceId: string;

  beforeEach(async () => {
    companyId = randomUUID();
    projectId = randomUUID();
    projectWorkspaceId = randomUUID();
    await db.insert(companies).values({
      id: companyId,
      name: "Paperclip",
      issuePrefix: `T${companyId.replace(/-/g, "").slice(0, 6).toUpperCase()}`,
      requireBoardApprovalForNewAgents: false,
    });
    await db.insert(projects).values({
      id: projectId,
      companyId,
      name: "Core platform",
    });
    await db.insert(projectWorkspaces).values({
      id: projectWorkspaceId,
      companyId,
      projectId,
      name: "primary",
      sourceType: "local_path",
    });
  });

  function declaration(overrides: Partial<WorkspaceTargetDeclarationV1> = {}): WorkspaceTargetDeclarationV1 {
    const repoUrl = overrides.privateTargetRef ?? "https://github.com/example/repo.git";
    const base: WorkspaceTargetDeclarationV1 = {
      version: 1,
      id: randomUUID(),
      companyId,
      projectId,
      projectWorkspaceId,
      kind: "repository_checkout",
      revision: 1,
      enabled: true,
      deliveryRequired: true,
      providerKey: "git",
      repositoryFingerprint: null,
      targetFingerprint: computeTargetFingerprint(companyId, "git", canonicalizeRepositoryLocator(repoUrl)),
      displayLabel: "example/repo",
      privateTargetRef: repoUrl,
      expectedRef: "main",
      deliveryMethod: "push",
      artifactClasses: [],
    };
    return { ...base, ...overrides };
  }

  async function makeIssue(overrides: Partial<typeof issues.$inferInsert> = {}) {
    const issueId = randomUUID();
    await db.insert(issues).values({
      id: issueId,
      companyId,
      projectId,
      projectWorkspaceId,
      title: "Ship the feature",
      status: "in_progress",
      priority: "medium",
      completionRequirement: "workspace_delivery",
      ...overrides,
    });
    return issueId;
  }

  it("resolves the issue-override declaration when present", async () => {
    const issueDeclaration = declaration({ displayLabel: "issue override" });
    const issueId = await makeIssue({
      executionPolicy: { workspaceTargetDeclaration: issueDeclaration },
    });

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("issue_override");
      expect(result.declaration.displayLabel).toBe("issue override");
    }
  });

  it("falls back to the project workspace declaration when the issue has no override", async () => {
    const workspaceDeclaration = declaration({ displayLabel: "workspace default" });
    await db.update(projectWorkspaces).set({ metadata: { workspaceTargetDeclaration: workspaceDeclaration } });
    const issueId = await makeIssue();

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("project_workspace");
      expect(result.declaration.displayLabel).toBe("workspace default");
    }
  });

  it("falls back to the project default declaration when neither issue nor workspace has one", async () => {
    const projectDeclaration = declaration({ displayLabel: "project default", projectWorkspaceId: null });
    await db.update(projects).set({ executionWorkspacePolicy: { workspaceTargetDeclaration: projectDeclaration } });
    const issueId = await makeIssue();

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.source).toBe("project_default");
      expect(result.declaration.displayLabel).toBe("project default");
    }
  });

  it("rejects as missing when no declaration exists at any tier", async () => {
    const issueId = await makeIssue();

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing");
  });

  it("rejects a disabled declaration rather than falling through to a lower tier", async () => {
    const disabledOverride = declaration({ enabled: false, displayLabel: "disabled override" });
    const workspaceDeclaration = declaration({ displayLabel: "workspace default" });
    await db.update(projectWorkspaces).set({ metadata: { workspaceTargetDeclaration: workspaceDeclaration } });
    const issueId = await makeIssue({
      executionPolicy: { workspaceTargetDeclaration: disabledOverride },
    });

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("disabled");
      expect(result.source).toBe("issue_override");
    }
  });

  it("rejects a declaration scoped to a different company", async () => {
    const otherCompanyDeclaration = declaration({ companyId: randomUUID() });
    const issueId = await makeIssue({
      executionPolicy: { workspaceTargetDeclaration: otherCompanyDeclaration },
    });

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("cross_company");
  });

  it("rejects an artifact_only declaration against a workspace_delivery requirement", async () => {
    const artifactOnly = declaration({
      kind: "artifact_only",
      privateTargetRef: null,
      targetFingerprint: "v1:unused",
      artifactClasses: ["work_product"],
    });
    const issueId = await makeIssue({
      executionPolicy: { workspaceTargetDeclaration: artifactOnly },
    });

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("target_kind_incompatible");
  });

  it("rejects a declaration whose stored fingerprint no longer matches its target ref", async () => {
    const tampered = declaration({ targetFingerprint: "v1:stale-fingerprint" });
    const issueId = await makeIssue({
      executionPolicy: { workspaceTargetDeclaration: tampered },
    });

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "workspace_delivery",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("fingerprint_mismatch");
  });

  it("allows an evidence_only issue to resolve an artifact_only declaration", async () => {
    const artifactOnly = declaration({
      kind: "artifact_only",
      privateTargetRef: null,
      targetFingerprint: "v1:unused",
      artifactClasses: ["work_product"],
    });
    const issueId = await makeIssue({
      completionRequirement: "artifact",
      executionPolicy: { workspaceTargetDeclaration: artifactOnly },
    });

    const result = await resolveWorkspaceTargetDeclaration({
      db,
      companyId,
      issueId,
      projectId,
      projectWorkspaceId,
      completionRequirement: "artifact",
    });

    expect(result.ok).toBe(true);
  });
});
