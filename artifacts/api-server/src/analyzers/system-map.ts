import { Analyzer, RepoContext, GithubTreeItem } from "./types";

export interface SystemMap {
  nodes: Array<{
    id: string;
    label: string;
    category: string;
    x: number;
    y: number;
    status: string;
    metadata: Record<string, any>;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  serviceCount: number;
  apiCount: number;
  databaseCount: number;
}

export const systemMapAnalyzer: Analyzer<SystemMap> = {
  name: "system-map",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    // Generating dynamic system map

    const nodes: any[] = [];
    const edges: any[] = [];
    let serviceCount = 0;
    let apiCount = 1; // Gateway
    let databaseCount = 0;

    // Extract top level folders to represent system modules
    const topLevelFolders = new Set<string>();
    files.forEach(f => {
      const parts = f.path.split("/");
      if (parts.length > 1) {
        // Skip hidden folders and common non-system folders
        if (!parts[0].startsWith(".") && !["node_modules", "dist", "build", "public", "tests"].includes(parts[0])) {
          topLevelFolders.add(parts[0]);
        }
      }
    });

    const services = Array.from(topLevelFolders).slice(0, 8); // max 8 for visual clarity

    nodes.push({ id: "api-gateway", label: "Client / Entry", category: "gateway", x: 400, y: 50, status: "healthy", metadata: { type: "Entrypoint" } });

    services.forEach((folder, i) => {
      const id = `svc-${folder}`;
      nodes.push({
        id,
        label: folder.charAt(0).toUpperCase() + folder.slice(1),
        category: "service",
        x: 100 + (i % 4) * 200,
        y: 200 + Math.floor(i / 4) * 150,
        status: "healthy",
        metadata: { path: `/${folder}` }
      });
      edges.push({ source: "api-gateway", target: id, type: "calls" });
      serviceCount++;
    });

    // Determine if we have databases based on file extensions
    const hasSql = files.some(f => f.path.endsWith(".sql") || f.path.includes("prisma"));
    const hasMongo = files.some(f => f.path.includes("mongoose") || f.path.includes("mongodb"));

    if (hasSql || hasMongo || services.length > 0) {
      nodes.push({
        id: "main-db",
        label: "Primary Database",
        category: "database",
        x: 400,
        y: 500,
        status: "healthy",
        metadata: { engine: hasMongo ? "MongoDB" : "SQL/Relational" }
      });
      databaseCount++;

      services.forEach((folder) => {
        edges.push({ source: `svc-${folder}`, target: "main-db", type: "queries" });
      });
    }

    if (nodes.length <= 1) {
      // Very simple single file repo fallback
      nodes.push({ id: "core-app", label: "Core Application", category: "service", x: 400, y: 250, status: "healthy", metadata: { type: "Monolith" } });
      edges.push({ source: "api-gateway", target: "core-app", type: "routes to" });
      serviceCount = 1;
    }

    return {
      nodes,
      edges,
      serviceCount,
      apiCount,
      databaseCount
    };
  }
};
