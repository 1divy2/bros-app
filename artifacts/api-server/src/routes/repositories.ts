import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { repositoriesTable, analysisResultsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateRepositoryBody } from "@workspace/api-zod";
import { fetchGithubMetadata } from "../services/github";
import { runAnalysisEngine } from "../analyzers";

const router = Router();

function parseGithubUrl(url: string): { owner: string; name: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("github.com")) return null;
    const parts = u.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length < 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], name: parts[1] };
  } catch {
    return null;
  }
}

router.get("/", async (req: Request, res: Response) => {
  const repos = await db.select().from(repositoriesTable).orderBy(repositoriesTable.createdAt);
  res.json(repos.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
  })));
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = CreateRepositoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { url } = parsed.data;
  const parts = parseGithubUrl(url);
  if (!parts) {
    res.status(400).json({ error: "Invalid GitHub repository URL" });
    return;
  }

  try {
    const githubData = await fetchGithubMetadata(parts.owner, parts.name);
    
    const [repo] = await db.insert(repositoriesTable).values({
      url,
      name: parts.name,
      owner: parts.owner,
      status: "queued",
      analysisProgress: 0,
      description: githubData.description,
      primaryLanguage: githubData.primaryLanguage,
      stars: githubData.stars,
      defaultBranch: githubData.defaultBranch,
      topics: githubData.topics,
      forks: githubData.forks,
      license: githubData.license,
      repoSize: githubData.repoSize,
    }).returning();

    // Fire and forget the analysis engine
    runAnalysisEngine(repo.id, parts.owner, parts.name, githubData.defaultBranch);

    res.status(201).json({
      ...repo,
      createdAt: repo.createdAt.toISOString(),
      completedAt: null,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to validate repository" });
    return;
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Repository not found" }); return; }
  res.json({ ...repo, createdAt: repo.createdAt.toISOString(), completedAt: repo.completedAt?.toISOString() ?? null });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(analysisResultsTable).where(eq(analysisResultsTable.repositoryId, id));
  await db.delete(repositoriesTable).where(eq(repositoriesTable.id, id));
  res.status(204).send();
});

router.post("/:id/analyze", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Repository not found" }); return; }

  // Clear existing analysis data
  await db.delete(analysisResultsTable).where(eq(analysisResultsTable.repositoryId, id));

  // Update repo status to queued
  const [updatedRepo] = await db.update(repositoriesTable)
    .set({ status: "queued", analysisProgress: 0, currentModule: null, completedAt: null })
    .where(eq(repositoriesTable.id, id))
    .returning();

  // Run analysis
  runAnalysisEngine(repo.id, repo.owner, repo.name, repo.defaultBranch || "main");

  res.status(202).json({
    ...updatedRepo,
    createdAt: updatedRepo.createdAt.toISOString(),
    completedAt: null,
  });
});

async function getModuleData(repoId: number, module: string) {
  const [result] = await db.select().from(analysisResultsTable)
    .where(and(eq(analysisResultsTable.repositoryId, repoId), eq(analysisResultsTable.module, module)));
  return result?.data ?? null;
}

router.get("/:id/architecture", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "architecture");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/dependencies", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "dependencies");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/apis", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "apis");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/databases", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "databases");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/security", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "security");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/quality", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "quality");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/infrastructure", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "infrastructure");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/cicd", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "cicd");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/business-flows", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "business-flows");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/knowledge-graph", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "knowledge-graph");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/docs", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "docs");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

router.get("/:id/system-map", async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id));
  const [repo] = await db.select().from(repositoriesTable).where(eq(repositoriesTable.id, id));
  if (!repo) { res.status(404).json({ error: "Not found" }); return; }
  const data = await getModuleData(id, "system-map");
  if (!data) { res.status(404).json({ error: "Analysis not ready" }); return; }
  res.json(data);
});

// We use runAnalysisEngine from analyzers/index.ts now.
// The hardcoded simulation logic has been removed to enforce the use of real AST/dependency mapping.


export default router;
