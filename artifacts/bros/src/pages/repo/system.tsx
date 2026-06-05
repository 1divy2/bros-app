import { useGetSystemMap, useGetRepository, getGetRepositoryQueryKey, getGetSystemMapQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import ReactFlow, { Background, Controls, MiniMap, NodeProps, Handle, Position, MarkerType } from "reactflow";
import "reactflow/dist/style.css";
import { useMemo } from "react";
import { Loader2, Server, Database, Network, Cpu, Zap, Layers, HardDrive, Globe } from "lucide-react";

const CATEGORY_STYLES: Record<string, { color: string; label: string; icon: any }> = {
  gateway: { color: "#a855f7", label: "text-purple-400", icon: Network },
  service: { color: "#3b82f6", label: "text-blue-400", icon: Cpu },
  database: { color: "#10b981", label: "text-emerald-400", icon: Database },
  cache: { color: "#06b6d4", label: "text-cyan-400", icon: Zap },
  queue: { color: "#f59e0b", label: "text-amber-400", icon: Layers },
  storage: { color: "#f97316", label: "text-orange-400", icon: HardDrive },
  external: { color: "#64748b", label: "text-slate-400", icon: Globe },
};

function SystemNode({ data }: NodeProps) {
  const cfg = CATEGORY_STYLES[data.category] ?? CATEGORY_STYLES.service;
  const statusDot = data.status === "degraded" ? "bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)]" : data.status === "down" ? "bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]" : "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]";
  const Icon = cfg.icon;

  return (
    <div 
      className="px-4 py-4 min-w-[200px] relative group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:scale-105"
      style={{
        background: `linear-gradient(145deg, rgba(13,14,17,0.95), rgba(10,11,13,0.9))`,
        borderRadius: '8px',
        border: `1px solid ${cfg.color}40`,
        borderBottom: `3px solid ${cfg.color}`,
        boxShadow: `0 8px 32px -8px ${cfg.color}40`,
        backdropFilter: "blur(12px)"
      }}
    >
      {/* Glow overlay */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, ${cfg.color}, transparent 70%)`
        }}
      />
      
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-background !border !border-border !rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon className="w-3.5 h-3.5 opacity-80" style={{ color: cfg.color }} />
            <span className={`font-mono text-[9px] uppercase tracking-widest font-bold ${cfg.label}`}>{data.category}</span>
          </div>
          
          <span className="font-mono font-bold text-sm text-white leading-tight truncate">{data.label}</span>
          
          {data.metadata && Object.keys(data.metadata).length > 0 && (
            <div className="mt-2 space-y-1 pt-2 border-t border-white/5">
              {Object.entries(data.metadata).slice(0, 3).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center font-mono text-[9px]">
                  <span className="text-slate-500 uppercase tracking-wider">{k}</span>
                  <span className="text-slate-300 font-bold">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 border border-black/50 ${statusDot}`} title={`Status: ${data.status}`} />
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-background !border !border-border !rounded-sm opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

const nodeTypes = { systemNode: SystemNode };

const ANALYSIS_MODULES = [
  "cloning", "repository-intelligence", "architecture-discovery",
  "dependency-intelligence", "api-intelligence", "database-intelligence",
  "security-intelligence", "code-quality", "infrastructure-intelligence",
  "cicd-intelligence", "business-flow-discovery", "documentation-engine",
  "knowledge-graph",
];

export default function SystemMap() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);

  const { data: repo } = useGetRepository(repoId, {
    query: {
      enabled: !!repoId,
      queryKey: getGetRepositoryQueryKey(repoId),
      refetchInterval: (query) => {
        const r = query.state.data;
        return r && (r.status === "analyzing" || r.status === "queued") ? 1500 : false;
      },
    },
  });

  const { data, isLoading, error } = useGetSystemMap(repoId, {
    query: {
      enabled: !!repoId && repo?.status === "complete",
      queryKey: getGetSystemMapQueryKey(repoId),
    },
  });

  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };

    const rfNodes = data.nodes.map((n) => ({
      id: n.id,
      type: "systemNode",
      position: { x: n.x, y: n.y },
      data: { label: n.label, category: n.category, status: n.status, metadata: n.metadata ?? {} },
    }));

    const rfEdges = data.edges.map((e, i) => {
      const edgeColor =
        e.type === "http" || e.type === "https" ? "hsl(217 33% 40%)" :
        e.type === "grpc" ? "hsl(280 60% 50%)" :
        e.type === "tcp" ? "hsl(215 20% 35%)" :
        e.type === "kafka" ? "hsl(38 80% 45%)" :
        "hsl(215 20% 30%)";

      return {
        id: `e-${e.source}-${e.target}-${i}`,
        source: e.source,
        target: e.target,
        animated: true,
        label: e.type,
        labelStyle: { fontFamily: "JetBrains Mono, monospace", fontSize: 9, fill: "hsl(215 20% 75%)", fontWeight: "bold" },
        labelBgStyle: { fill: "#0a0b0d", fillOpacity: 0.9, stroke: edgeColor, strokeWidth: 1, rx: 4, ry: 4 },
        style: { stroke: edgeColor, strokeWidth: e.weight ? Math.max(1.5, Math.round((e.weight ?? 0.5) * 2.5)) : 2, filter: `drop-shadow(0 0 4px ${edgeColor})` },
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 14, height: 14 },
      };
    });

    return { nodes: rfNodes, edges: rfEdges };
  }, [data]);

  const isAnalyzing = repo?.status === "analyzing" || repo?.status === "queued";
  const progress = repo?.analysisProgress ?? 0;
  const currentModuleIdx = ANALYSIS_MODULES.indexOf(repo?.currentModule ?? "");

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading && !isAnalyzing}
        error={error}
        hasData={isAnalyzing || !!data}
        loadingMessage="Loading system map..."
        errorMessage="System topology not available."
        queryKeyToInvalidate={getGetSystemMapQueryKey(repoId)}
        className="absolute inset-0 w-full h-full"
      >
        {isAnalyzing ? (
          /* Analysis Progress Overlay */
          <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="font-mono font-bold text-primary text-sm">Analyzing repository...</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground">
                {repo?.currentModule?.replace(/-/g, " ").toUpperCase() || "Starting analysis..."}
              </p>
            </div>

            {/* Overall progress bar */}
            <div className="w-full max-w-md">
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground mb-2">
                <span>OVERALL PROGRESS</span>
                <span className="text-amber-400">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent animate-pulse" />
              </div>
            </div>

            {/* Module steps */}
            <div className="grid grid-cols-3 gap-px bg-border w-full max-w-2xl">
              {ANALYSIS_MODULES.map((mod, i) => {
                const isDone = currentModuleIdx > i || (progress === 100);
                const isCurrent = mod === repo?.currentModule;
                return (
                  <div key={mod} className={`bg-background px-3 py-2 flex items-center gap-2 ${isCurrent ? "bg-amber-500/10" : ""}`}>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isDone ? "bg-green-500" : isCurrent ? "bg-amber-400 animate-pulse" : "bg-border"
                    }`} />
                    <span className={`font-mono text-[9px] uppercase truncate ${
                      isCurrent ? "text-amber-400" : isDone ? "text-green-400/60" : "text-muted-foreground/40"
                    }`}>
                      {mod.replace(/-/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live stats as they appear */}
            {repo && (repo.totalFiles != null || repo.primaryLanguage != null) && (
              <div className="flex items-center gap-6 font-mono text-[10px] border border-border px-6 py-3 bg-card/30">
                {repo.primaryLanguage && <span className="text-cyan-400">{repo.primaryLanguage.toUpperCase()}</span>}
                {repo.totalFiles != null && <span className="text-muted-foreground">{repo.totalFiles.toLocaleString()} FILES</span>}
                {repo.totalLines != null && <span className="text-muted-foreground">{repo.totalLines.toLocaleString()} LINES</span>}
                {repo.stars != null && <span className="text-amber-400">{repo.stars.toLocaleString()} STARS</span>}
              </div>
            )}
          </div>
        ) : !data || data.nodes.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 font-mono text-muted-foreground">
            <span className="text-sm">No system topology detected</span>
            <span className="text-[10px] opacity-50">Analysis may still be processing</span>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="bg-transparent"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="hsl(215 14% 30%)" gap={32} size={1.5} style={{ opacity: 0.2 }} />
            <Controls
              className="bg-background border border-border"
              style={{ bottom: 16, right: 16, left: "auto" }}
            />
            <MiniMap
              className="bg-background border border-border"
              nodeColor={(n) => {
                const category = (n.data as any)?.category;
                const colorMap: Record<string, string> = {
                  gateway: "hsl(280 60% 50%)",
                  service: "hsl(217 91% 60%)",
                  database: "hsl(160 60% 45%)",
                  cache: "hsl(190 100% 50%)",
                  queue: "hsl(38 92% 50%)",
                  storage: "hsl(25 95% 53%)",
                  external: "hsl(215 14% 45%)",
                };
                return colorMap[category] ?? "hsl(215 14% 35%)";
              }}
              maskColor="rgba(10, 11, 13, 0.7)"
            />
          </ReactFlow>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
