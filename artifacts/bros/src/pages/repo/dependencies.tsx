import { useGetDependencies, getGetDependenciesQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { LayoutTemplate } from "lucide-react";
import { useState, useMemo } from "react";
import ReactFlow, { Background, Controls, Node, Edge, Position } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";

const TYPE_COLORS: Record<string, string> = {
  internal: "text-cyan-400 border-cyan-500/40",
  external: "text-blue-400 border-blue-500/40",
  dev: "text-slate-400 border-slate-500/40",
  peer: "text-purple-400 border-purple-500/40",
};

const getLayoutedElements = (nodes: any[], edges: any[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "LR" });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 180, height: 40 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 20,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export default function Dependencies() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetDependencies(repoId, {
    query: { enabled: !!repoId, queryKey: getGetDependenciesQueryKey(repoId) },
  });
  const [filter, setFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"table" | "graph">("table");

  const filtered = data?.nodes.filter((n) =>
    filter === "ALL" ? true :
    filter === "CIRCULAR" ? n.circular :
    filter === "UNUSED" ? n.unused :
    filter === "VULNERABLE" ? (n.vulnerabilities ?? 0) > 0 :
    n.type === filter.toLowerCase()
  );

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data) return { initialNodes: [], initialEdges: [] };
    const rfNodes: Node[] = data.nodes.map(n => ({
      id: n.id,
      data: { label: `${n.name}\n${n.version}` },
      style: {
        background: n.circular ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 0, 0, 0.5)',
        color: '#fff',
        border: `1px solid ${n.circular ? '#ef4444' : '#333'}`,
        fontSize: '10px',
        fontFamily: 'monospace',
        width: 180,
      }
    }));
    const rfEdges: Edge[] = data.edges.map(e => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: e.circular,
      style: { stroke: e.circular ? '#ef4444' : '#666' }
    }));
    
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(rfNodes, rfEdges);
    return { initialNodes: layoutedNodes, initialEdges: layoutedEdges };
  }, [data]);

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading dependencies..."
        errorMessage="Dependency analysis not available."
        queryKeyToInvalidate={getGetDependenciesQueryKey(repoId)}
        className="h-full w-full flex flex-col overflow-hidden relative"
      >
        {data && (
          <>
            {/* Stats */}
            <div className="border-b border-white/5 px-8 py-4 flex items-center gap-10 bg-background/40 backdrop-blur-md z-10 flex-shrink-0">
              {[
                { label: "TOTAL PACKAGES", value: data.nodes.length, color: "text-foreground" },
                { label: "EXTERNAL", value: data.totalExternal, color: "text-blue-400" },
                { label: "INTERNAL", value: data.totalInternal, color: "text-cyan-400" },
                { label: "CIRCULAR DEPS", value: data.circularCount, color: "text-red-400" },
                { label: "UNUSED PACKAGES", value: data.unusedCount, color: "text-amber-400" },
                { label: "EDGES", value: data.edges.length, color: "text-muted-foreground" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
                  <span className={`font-mono font-bold text-2xl mt-1 ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="border-b border-white/5 px-8 py-3 flex items-center justify-between bg-card/10 backdrop-blur-md z-10 flex-shrink-0">
              <div className="flex items-center gap-2">
                {["ALL", "EXTERNAL", "INTERNAL", "DEV", "CIRCULAR", "UNUSED", "VULNERABLE"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`font-mono text-[9px] font-bold uppercase px-3 py-1.5 rounded transition-all duration-300 ${
                      filter === f
                        ? "bg-primary/20 text-primary border border-primary/30"
                        : "bg-white/5 text-muted-foreground border border-transparent hover:text-foreground hover:bg-white/10"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setViewMode(v => v === "table" ? "graph" : "table")}
                className="flex items-center gap-2 font-mono text-[10px] uppercase font-bold px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-colors"
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                {viewMode === "table" ? "VIEW GRAPH" : "VIEW TABLE"}
              </button>
            </div>

            {viewMode === "graph" ? (
              <div className="flex-1 w-full relative">
                 <ReactFlow 
                    nodes={initialNodes}
                    edges={initialEdges}
                    fitView
                    className="touch-none"
                    minZoom={0.1}
                 >
                    <Background color="#333" gap={16} />
                    <Controls className="bg-black/50 border-white/10 fill-white" />
                 </ReactFlow>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-auto p-6 z-10 relative">
                <div className="glass-panel rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-6 py-3 tracking-widest font-bold">PACKAGE</th>
                        <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest font-bold">VERSION</th>
                        <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest font-bold">TYPE</th>
                        <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest font-bold">SIZE</th>
                        <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest font-bold">FLAGS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered?.map((dep) => (
                        <tr
                          key={dep.id}
                          className={`border-b border-white/5 hover:bg-white/5 transition-colors ${dep.circular ? "bg-red-500/5" : dep.unused ? "bg-amber-500/5" : ""}`}
                        >
                          <td className="px-6 py-3">
                            <span className="font-mono text-sm font-bold text-foreground">{dep.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-muted-foreground">{dep.version}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-mono text-[9px] px-2 py-0.5 rounded border ${TYPE_COLORS[dep.type] || "text-muted-foreground border-white/10"}`}>
                              {dep.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3 w-32">
                              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (dep.size / 30) * 100)}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-muted-foreground w-8">{dep.size}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {dep.circular && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 bg-red-500/10 font-bold tracking-widest">CIRCULAR</span>}
                              {dep.unused && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10 font-bold tracking-widest">UNUSED</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
