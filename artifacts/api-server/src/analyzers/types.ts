export interface RepoContext {
  id: number;
  owner: string;
  name: string;
  defaultBranch: string;
}

export interface GithubTreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

export interface FileNode {
  path: string;
  name: string;
  type: "file" | "dir";
  size?: number;
  children?: FileNode[];
  content?: string; // Loaded on demand
}

// Analyzer results matching OpenAPI schemas

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category?: string;
  metadata?: Record<string, any>;
  x?: number;
  y?: number;
  status?: string;
  connections?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
  label?: string;
}

export interface ArchitectureAnalysis {
  pattern: "monolith" | "modular-monolith" | "microservices" | "event-driven" | "layered" | "hexagonal" | "clean";
  confidenceScore: number;
  reasoning: string;
  layers: Array<{ name: string; components: string[] }>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  languages: Array<{ language: string; percentage: number; lines: number }>;
  totalFiles: number;
  totalLines: number;
}

export interface DependencyGraph {
  nodes: Array<{
    id: string;
    name: string;
    version: string;
    type: "internal" | "external" | "dev" | "peer";
    size: number;
    circular: boolean;
    unused: boolean;
    vulnerabilities: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    circular: boolean;
  }>;
  circularCount: number;
  unusedCount: number;
  totalExternal: number;
  totalInternal: number;
}

// Shared analyzer interface
export interface Analyzer<T> {
  name: string;
  analyze: (ctx: RepoContext, files: GithubTreeItem[]) => Promise<T>;
}
