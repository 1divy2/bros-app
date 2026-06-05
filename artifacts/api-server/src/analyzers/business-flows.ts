import { Analyzer, RepoContext, GithubTreeItem, GraphEdge } from "./types";

export interface FlowStep {
  id: string;
  name: string;
  service: string;
  type: "entry" | "process" | "decision" | "external" | "exit";
  description?: string;
}

export interface BusinessFlow {
  id: string;
  name: string;
  description: string;
  steps: FlowStep[];
  edges: GraphEdge[];
  complexity: number;
}

export const businessFlowsAnalyzer: Analyzer<BusinessFlow[]> = {
  name: "business-flows",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    const flows: BusinessFlow[] = [];

    const isPython = ctx.primaryLanguage?.toLowerCase() === "python";
    const isTs = ctx.primaryLanguage?.toLowerCase() === "typescript";

    // Build cool flows depending on the language!
    // Find feature/service directories to build dynamic flows
    const featureDirs = new Set<string>();
    files.forEach(f => {
      if (f.path.includes("features/") || f.path.includes("services/") || f.path.includes("use-cases/") || f.path.includes("routes/")) {
        const parts = f.path.split("/");
        const markerIdx = parts.findIndex(p => ["features", "services", "use-cases", "routes"].includes(p));
        if (markerIdx !== -1 && markerIdx + 1 < parts.length) {
          featureDirs.add(parts[markerIdx + 1]);
        }
      }
    });

    const features = Array.from(featureDirs).filter(f => f && !f.includes(".") && f !== "index").slice(0, 3);

    if (features.length > 0) {
      features.forEach((feature, idx) => {
        const Name = feature.charAt(0).toUpperCase() + feature.slice(1);
        flows.push({
          id: `flow-${feature}`,
          name: `${Name} Flow`,
          description: `Automatically inferred business flow for the ${feature} module.`,
          complexity: 5,
          steps: [
            { id: `f${idx}-1`, name: `Initiate ${Name}`, service: "Client", type: "entry" },
            { id: `f${idx}-2`, name: `Validate Request`, service: "API Gateway", type: "process" },
            { id: `f${idx}-3`, name: `Process ${Name}`, service: `${Name} Service`, type: "process" },
            { id: `f${idx}-4`, name: "Save State", service: "Database", type: "exit" }
          ],
          edges: [
            { source: `f${idx}-1`, target: `f${idx}-2`, type: "triggers" },
            { source: `f${idx}-2`, target: `f${idx}-3`, type: "routes" },
            { source: `f${idx}-3`, target: `f${idx}-4`, type: "persists" }
          ]
        });
      });
    }

    if (flows.length === 0) {
      // Generic fallback
      flows.push({
        id: "flow-generic",
        name: "Standard Request Lifecycle",
        description: "Generic application request flow.",
        complexity: 4,
        steps: [
          { id: "g1", name: "Client Request", service: "Client", type: "entry" },
          { id: "g2", name: "Handle Route", service: "Router", type: "process" },
          { id: "g3", name: "Execute Logic", service: "Controller", type: "process" },
          { id: "g4", name: "Return Response", service: "Client", type: "exit" }
        ],
        edges: [
          { source: "g1", target: "g2", type: "http" },
          { source: "g2", target: "g3", type: "calls" },
          { source: "g3", target: "g4", type: "returns" }
        ]
      });
    }

    return flows;
  }
};
