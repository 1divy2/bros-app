import { fetchRepositoryTree } from "./tree";
import { architectureAnalyzer } from "./architecture";
import { dependencyAnalyzer } from "./dependencies";
import { databasesAnalyzer } from "./databases";
import { securityAnalyzer } from "./security";
import { qualityAnalyzer } from "./quality";
import { infrastructureAnalyzer } from "./infrastructure";
import { cicdAnalyzer } from "./cicd";
import { systemMapAnalyzer } from "./system-map";
import { businessFlowsAnalyzer } from "./business-flows";
import { knowledgeGraphAnalyzer } from "./knowledge-graph";
import { docsAnalyzer } from "./docs";
import { apisAnalyzer } from "./apis";
import { RepoContext } from "./types";
import { db, repositoriesTable, analysisResultsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function runAnalysisEngine(repoId: number, owner: string, name: string, defaultBranch: string) {
  const ctx: RepoContext = { id: repoId, owner, name, defaultBranch };
  
  try {
    await db.update(repositoriesTable)
      .set({ status: "analyzing", currentModule: "fetching-tree" })
      .where(eq(repositoriesTable.id, repoId));

    const files = await fetchRepositoryTree(owner, name, defaultBranch);
    
    const runAnalyzer = async (moduleName: string, analyzerFn: () => Promise<any>) => {
      await db.update(repositoriesTable).set({ currentModule: moduleName }).where(eq(repositoriesTable.id, repoId));
      const data = await analyzerFn();
      await db.insert(analysisResultsTable).values({ repositoryId: repoId, module: moduleName, data });
      return data;
    };

    // Run real analyzers for all modules
    const archData = await runAnalyzer("architecture", () => architectureAnalyzer.analyze(ctx, files));
    await runAnalyzer("dependencies", () => dependencyAnalyzer.analyze(ctx, files));
    await runAnalyzer("apis", () => apisAnalyzer.analyze(ctx, files));
    await runAnalyzer("databases", () => databasesAnalyzer.analyze(ctx, files));
    await runAnalyzer("security", () => securityAnalyzer.analyze(ctx, files));
    await runAnalyzer("quality", () => qualityAnalyzer.analyze(ctx, files));
    await runAnalyzer("infrastructure", () => infrastructureAnalyzer.analyze(ctx, files));
    await runAnalyzer("cicd", () => cicdAnalyzer.analyze(ctx, files));
    await runAnalyzer("system-map", () => systemMapAnalyzer.analyze(ctx, files));
    await runAnalyzer("business-flows", () => businessFlowsAnalyzer.analyze(ctx, files));
    await runAnalyzer("knowledge-graph", () => knowledgeGraphAnalyzer.analyze(ctx, files));
    await runAnalyzer("docs", () => docsAnalyzer.analyze(ctx, files));

    // Update repository totals from architecture analyzer
    await db.update(repositoriesTable)
      .set({ 
        totalFiles: archData.totalFiles,
        totalLines: archData.totalLines,
      })
      .where(eq(repositoriesTable.id, repoId));
    
    // Mark as complete
    await db.update(repositoriesTable)
      .set({
        status: "complete",
        analysisProgress: 100,
        currentModule: null,
        completedAt: new Date()
      })
      .where(eq(repositoriesTable.id, repoId));

  } catch (error: any) {
    console.error(`Analysis failed for ${owner}/${name}:`, error);
    await db.update(repositoriesTable)
      .set({
        status: "failed",
        currentModule: null,
        errorMessage: error.message || "Unknown error"
      })
      .where(eq(repositoriesTable.id, repoId));
  }
}
