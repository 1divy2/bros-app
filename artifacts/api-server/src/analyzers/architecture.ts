import { Analyzer, RepoContext, GithubTreeItem, ArchitectureAnalysis } from "./types";

export const architectureAnalyzer: Analyzer<ArchitectureAnalysis> = {
  name: "architecture",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    
    // 1. Calculate Languages
    const extCount: Record<string, number> = {};
    const extToLang: Record<string, string> = {
      ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript",
      py: "Python", go: "Go", java: "Java", rb: "Ruby", php: "PHP", rs: "Rust",
      cs: "C#", cpp: "C++", c: "C", swift: "Swift", kt: "Kotlin",
      html: "HTML", css: "CSS", scss: "SCSS"
    };

    let totalLines = 0;
    files.filter(f => f.type === "blob").forEach(f => {
      const parts = f.path.split(".");
      const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
      if (extToLang[ext]) {
        extCount[ext] = (extCount[ext] || 0) + 1;
        totalLines += 150; // heuristic estimation for lines of code per file
      }
    });

    const languageCounts = Object.entries(extCount).map(([ext, count]) => ({
      language: extToLang[ext],
      lines: count * 150
    })).sort((a, b) => b.lines - a.lines);

    // Group by language name (since ts and tsx both map to TypeScript)
    const groupedLanguages: Record<string, number> = {};
    languageCounts.forEach(l => {
      groupedLanguages[l.language] = (groupedLanguages[l.language] || 0) + l.lines;
    });

    const finalLanguages = Object.entries(groupedLanguages).map(([language, lines]) => ({
      language,
      lines,
      percentage: totalLines > 0 ? (lines / totalLines) * 100 : 0
    })).sort((a, b) => b.lines - a.lines).slice(0, 5);

    // 2. Discover Architecture Pattern and Layers
    let pattern: ArchitectureAnalysis["pattern"] = "monolith";
    let confidenceScore = 0.6;
    let reasoning = "Standard project structure detected.";

    const hasControllers = files.some(f => f.path.includes("/controllers/") || f.path.includes("/routes/"));
    const hasServices = files.some(f => f.path.includes("/services/"));
    const hasRepositories = files.some(f => f.path.includes("/repositories/") || f.path.includes("/db/"));
    const hasMicroservices = files.some(f => f.path.includes("docker-compose") && (f.path.includes("services/") || f.path.includes("apps/")));
    
    if (hasMicroservices) {
      pattern = "microservices";
      confidenceScore = 0.85;
      reasoning = "Detected multiple distinct service folders or apps alongside orchestration files, suggesting a microservices architecture.";
    } else if (hasControllers && hasServices && hasRepositories) {
      pattern = "layered";
      confidenceScore = 0.9;
      reasoning = "Detected separation of concerns via 'controllers', 'services', and 'repositories' directories, indicating a standard N-Tier/Layered architecture.";
    } else if (hasControllers || hasServices) {
      pattern = "modular-monolith";
      confidenceScore = 0.75;
      reasoning = "Detected some modular separation but within a single unified codebase.";
    }

    const layers: { name: string; components: string[] }[] = [];
    const nodes: { id: string; label: string; type: string }[] = [];
    const edges: { source: string; target: string }[] = [];

    // Helper to get unique directories at a certain depth
    const getDirs = (keyword: string) => {
      const dirs = new Set<string>();
      files.forEach(f => {
        if (f.path.includes(keyword)) {
          const parts = f.path.split("/");
          const idx = parts.indexOf(keyword.replace(/\//g, ""));
          if (idx !== -1 && idx + 1 < parts.length) {
            let componentName = parts[idx + 1].replace(/\.[^/.]+$/, ""); // remove extension if it's a file
            if (componentName !== "index") dirs.add(componentName);
          }
        }
      });
      return Array.from(dirs).slice(0, 5);
    };

    if (pattern === "layered" || pattern === "modular-monolith") {
      layers.push({ name: "Presentation", components: ["API Routes", ...getDirs("controllers")] });
      layers.push({ name: "Business Logic", components: ["Core Services", ...getDirs("services")] });
      layers.push({ name: "Data Access", components: ["Database", ...getDirs("repositories")] });

      nodes.push({ id: "api", label: "API Gateway", type: "gateway" });
      nodes.push({ id: "biz", label: "Business Logic", type: "core" });
      nodes.push({ id: "db", label: "Data Access", type: "database" });
      
      edges.push({ source: "api", target: "biz" });
      edges.push({ source: "biz", target: "db" });
    } else {
      layers.push({ name: "Core", components: ["Main Application", "Lib"] });
      nodes.push({ id: "app", label: "Application", type: "core" });
    }

    return {
      pattern,
      confidenceScore,
      reasoning,
      layers,
      nodes,
      edges,
      languages: finalLanguages,
      totalFiles: files.length,
      totalLines,
    };
  }
};
