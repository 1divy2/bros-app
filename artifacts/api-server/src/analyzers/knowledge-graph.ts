import { Analyzer, RepoContext, GithubTreeItem, GraphNode, GraphEdge } from "./types";

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const knowledgeGraphAnalyzer: Analyzer<KnowledgeGraph> = {
  name: "knowledge-graph",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Base nodes
    nodes.push({ id: "repo", label: ctx.name, type: "repository", category: "core" });
    
    // Extract domain concepts based on folder/file names
    const domains = new Set<string>();
    
    files.forEach(f => {
      // Find top-level or significant directories
      const parts = f.path.split('/');
      if (parts.length > 1) {
        const topLevel = parts[0];
        if (!['node_modules', 'dist', 'build', '.git', '.github', 'src', 'tests', 'docs'].includes(topLevel)) {
          domains.add(topLevel);
        } else if (topLevel === 'src' && parts.length > 2) {
          domains.add(parts[1]); // Add subdirectories of src
        }
      }
    });

    const domainArray = Array.from(domains).slice(0, 15); // Limit to top 15 domains

    domainArray.forEach(domain => {
      if (domain.length < 3) return; // Skip very short generic names
      
      const nodeId = `domain-${domain}`;
      nodes.push({
        id: nodeId,
        label: domain,
        type: "domain",
        category: "domain"
      });
      
      edges.push({
        source: "repo",
        target: nodeId,
        type: "contains"
      });
    });

    // Add tech stack concepts
    const hasReact = files.some(f => f.path.includes("react") || f.path.endsWith(".tsx"));
    if (hasReact) {
      nodes.push({ id: "tech-react", label: "React", type: "technology", category: "frontend" });
      edges.push({ source: "repo", target: "tech-react", type: "uses" });
    }

    const hasNode = files.some(f => f.path.endsWith("package.json"));
    if (hasNode) {
      nodes.push({ id: "tech-node", label: "Node.js", type: "technology", category: "backend" });
      edges.push({ source: "repo", target: "tech-node", type: "uses" });
    }

    const hasPython = files.some(f => f.path.endsWith(".py") || f.path === "requirements.txt");
    if (hasPython) {
      nodes.push({ id: "tech-python", label: "Python", type: "technology", category: "backend" });
      edges.push({ source: "repo", target: "tech-python", type: "uses" });
    }

    // Extract actual dependencies if package.json exists
    const pkgFiles = files.filter(f => f.path.endsWith("package.json") && !f.path.includes("node_modules"));
    if (pkgFiles.length > 0) {
      const { fetchFileContent } = await import("./tree");
      for (const pkg of pkgFiles) {
        const content = await fetchFileContent(ctx.owner, ctx.name, pkg.path);
        if (content) {
          try {
            const parsed = JSON.parse(content);
            const deps = { ...parsed.dependencies };
            Object.keys(deps).slice(0, 5).forEach(dep => {
              nodes.push({ id: `dep-${dep}`, label: dep, type: "technology", category: "dependency" });
              edges.push({ source: "repo", target: `dep-${dep}`, type: "depends_on" });
            });
          } catch (e) {
            // ignore
          }
        }
      }
    }

    // Default graph if too small
    if (nodes.length < 3) {
      nodes.push({ id: "domain-core", label: "Core Logic", type: "domain", category: "domain" });
      nodes.push({ id: "domain-data", label: "Data Access", type: "domain", category: "domain" });
      edges.push({ source: "repo", target: "domain-core", type: "contains" });
      edges.push({ source: "repo", target: "domain-data", type: "contains" });
    }

    return {
      nodes,
      edges
    };
  }
};
