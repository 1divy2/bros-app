import { Analyzer, RepoContext, GithubTreeItem, DependencyGraph } from "./types";
import { fetchFileContent } from "./tree";

export const dependencyAnalyzer: Analyzer<DependencyGraph> = {
  name: "dependencies",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    // 1. Process package.json files (cap at 20 to prevent hanging on massive monorepos)
    const packageFiles = files.filter(f => f.type === "blob" && f.path.endsWith("package.json") && !f.path.includes("node_modules")).slice(0, 20);
    
    const nodes: DependencyGraph["nodes"] = [];
    const edges: DependencyGraph["edges"] = [];
    
    for (const file of packageFiles) {
      const content = await fetchFileContent(ctx.owner, ctx.name, file.path);
      if (!content) continue;
      
      try {
        const pkg = JSON.parse(content);
        const internalName = pkg.name || file.path;
        
        if (!nodes.find(n => n.id === internalName)) {
          nodes.push({ id: internalName, name: internalName, version: pkg.version || "0.0.0", type: "internal", size: 1, circular: false, unused: false, vulnerabilities: 0 });
        }

        const parseDeps = (deps: Record<string, string> | undefined, type: "external" | "dev" | "peer") => {
          if (!deps) return;
          for (const [name, version] of Object.entries(deps)) {
            if (!nodes.find(n => n.id === name)) {
              nodes.push({ id: name, name: name, version: version.replace(/[\^~]/g, ""), type, size: 1, circular: false, unused: false, vulnerabilities: 0 });
            } else {
              nodes.find(n => n.id === name)!.size++;
            }
            edges.push({ source: internalName, target: name, circular: false });
          }
        };

        parseDeps(pkg.dependencies, "external");
        parseDeps(pkg.devDependencies, "dev");
        parseDeps(pkg.peerDependencies, "peer");
      } catch (e) {
        console.warn("Failed to parse package.json", file.path);
      }
    }

    // 2. Process requirements.txt files (cap at 20)
    const pyFiles = files.filter(f => f.type === "blob" && f.path.endsWith("requirements.txt")).slice(0, 20);
    for (const file of pyFiles) {
      const content = await fetchFileContent(ctx.owner, ctx.name, file.path);
      if (!content) continue;
      
      const internalName = file.path;
      if (!nodes.find(n => n.id === internalName)) {
        nodes.push({ id: internalName, name: internalName, version: "0.0.0", type: "internal", size: 1, circular: false, unused: false, vulnerabilities: 0 });
      }

      const lines = content.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
      for (const line of lines) {
        const parts = line.split("==");
        const name = parts[0].trim();
        const version = parts[1]?.trim() || "latest";

        if (!nodes.find(n => n.id === name)) {
          nodes.push({ id: name, name: name, version, type: "external", size: 1, circular: false, unused: false, vulnerabilities: 0 });
        } else {
          nodes.find(n => n.id === name)!.size++;
        }
        edges.push({ source: internalName, target: name, circular: false });
      }
    }

    const totalExternal = nodes.filter(n => n.type !== "internal").length;
    const totalInternal = nodes.filter(n => n.type === "internal").length;

    return {
      nodes,
      edges,
      circularCount: 0,
      unusedCount: 0,
      totalExternal,
      totalInternal
    };
  }
};
