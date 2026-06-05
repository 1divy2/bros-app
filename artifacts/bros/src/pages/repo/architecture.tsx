import { useGetArchitecture, getGetArchitectureQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { useMemo } from "react";
import ReactFlow, { Background, Controls, Node, Edge } from "reactflow";
import "reactflow/dist/style.css";

const PATTERN_COLORS: Record<string, string> = {
  microservices: "hsl(190 100% 50%)",
  "modular-monolith": "hsl(38 92% 50%)",
  monolith: "hsl(215 20% 65%)",
  "event-driven": "hsl(280 80% 60%)",
  layered: "hsl(142 71% 45%)",
  hexagonal: "hsl(190 100% 50%)",
  clean: "hsl(142 71% 45%)",
};

const LANG_COLORS = [
  "hsl(190 100% 50%)",
  "hsl(38 92% 50%)",
  "hsl(280 80% 60%)",
  "hsl(142 71% 45%)",
  "hsl(215 20% 65%)",
];

export default function Architecture() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetArchitecture(repoId, {
    query: { enabled: !!repoId, queryKey: getGetArchitectureQueryKey(repoId) },
  });

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data) return { initialNodes: [], initialEdges: [] };
    
    // Fallback minimal grid layout if no explicit positions provided
    const rfNodes: Node[] = data.nodes.map((n, i) => {
      const color = n.type === 'core' || n.type === 'module' ? '#3b82f6' : 
                   n.type === 'app' || n.type === 'gateway' ? '#a855f7' :
                   n.type === 'database' ? '#10b981' : '#06b6d4';
      
      return {
        id: n.id,
        data: { label: (
          <div className="flex flex-col gap-1 items-center justify-center h-full">
            <span style={{ color, fontSize: 8, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{n.type}</span>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{n.label}</span>
          </div>
        )},
        position: { x: (i % 3) * 250, y: Math.floor(i / 3) * 150 },
        style: {
          background: `linear-gradient(145deg, rgba(13,14,17,0.95), rgba(10,11,13,0.9))`,
          border: `1px solid ${color}40`,
          borderBottom: `3px solid ${color}`,
          boxShadow: `0 8px 32px -8px ${color}40`,
          backdropFilter: "blur(12px)",
          borderRadius: '8px',
          width: 180,
          padding: '12px 8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }
      };
    });
    
    const rfEdges: Edge[] = data.edges.map(e => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: '#06b6d4', strokeWidth: 2, filter: 'drop-shadow(0 0 4px #06b6d4)' }
    }));

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [data]);

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading architecture..."
        errorMessage="Architecture analysis not available."
        queryKeyToInvalidate={getGetArchitectureQueryKey(repoId)}
      >
        {data && (
          <div className="grid grid-cols-12 gap-6 relative z-10">
            {/* Pattern Detection - Large */}
            <div className="col-span-12 glass-panel p-8 rounded-xl border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3 font-bold opacity-70">DETECTED PATTERN</p>
                  <h1 className="font-mono font-black text-5xl tracking-tighter" style={{ color: PATTERN_COLORS[data.pattern] || "white" }}>
                    {data.pattern.toUpperCase().replace(/-/g, " ")}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2 font-bold opacity-70">CONFIDENCE</p>
                  <div className="flex items-baseline gap-1 justify-end">
                    <span className="font-mono font-black text-4xl text-primary">{(data.confidenceScore * 100).toFixed(0)}</span>
                    <span className="font-mono text-muted-foreground text-xl">%</span>
                  </div>
                  <div className="mt-3 w-40 h-1.5 bg-black/40 ml-auto rounded-full overflow-hidden shadow-inner border border-white/5">
                    <div className="h-full bg-primary" style={{ width: `${data.confidenceScore * 100}%` }} />
                  </div>
                </div>
              </div>
              <p className="font-mono text-sm text-muted-foreground leading-relaxed border-l-2 border-primary/40 pl-5 bg-white/5 py-4 pr-4 rounded-r relative z-10">
                {data.reasoning}
              </p>
            </div>

            {/* Architecture Layers */}
            <div className="col-span-12 lg:col-span-7 glass-panel p-6 rounded-xl border border-white/10">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-6 font-bold opacity-70">ARCHITECTURE LAYERS</p>
              <div className="space-y-4">
                {data.layers.map((layer) => (
                  <div key={layer.name} className="flex items-start gap-6 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                    <div className="w-28 flex-shrink-0 pt-1">
                      <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-wider">{layer.name}</span>
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {layer.components.map((comp) => (
                        <span key={comp} className="font-mono text-[10px] px-3 py-1 bg-black/40 border border-white/10 text-white rounded">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="col-span-12 lg:col-span-5 glass-panel p-6 rounded-xl border border-white/10 flex flex-col gap-6">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-70">CODEBASE STATS</p>
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="bg-black/20 border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">TOTAL FILES</p>
                  <p className="font-mono font-bold text-3xl text-white">{data.totalFiles?.toLocaleString() ?? "—"}</p>
                </div>
                <div className="bg-black/20 border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">TOTAL LINES</p>
                  <p className="font-mono font-bold text-3xl text-white">{data.totalLines?.toLocaleString() ?? "—"}</p>
                </div>
                <div className="bg-black/20 border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">LANGUAGES</p>
                  <p className="font-mono font-bold text-3xl text-white">{data.languages?.length ?? 0}</p>
                </div>
                <div className="bg-black/20 border border-white/5 p-4 rounded-lg flex flex-col justify-center">
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mb-2">LAYERS</p>
                  <p className="font-mono font-bold text-3xl text-white">{data.layers.length}</p>
                </div>
              </div>
            </div>

            {/* Language Breakdown */}
            {data.languages && data.languages.length > 0 && (
              <div className="col-span-12 glass-panel p-6 rounded-xl border border-white/10">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-6 font-bold opacity-70">LANGUAGE DISTRIBUTION</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  {data.languages.map((lang, i) => (
                    <div key={lang.language} className="flex items-center gap-4">
                      <span className="font-mono text-xs font-bold w-28 text-white truncate">{lang.language}</span>
                      <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full transition-all duration-1000"
                          style={{ width: `${lang.percentage}%`, backgroundColor: LANG_COLORS[i % LANG_COLORS.length] }}
                        />
                      </div>
                      <span className="font-mono text-xs w-14 text-right text-muted-foreground">{lang.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Component Graph */}
            <div className="col-span-12 glass-panel p-6 rounded-xl border border-white/10 flex flex-col min-h-[500px]">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4 font-bold opacity-70">
                COMPONENT RELATIONSHIPS ({data.nodes.length} nodes, {data.edges.length} edges)
              </p>
              <div className="flex-1 w-full bg-black/40 rounded-lg border border-white/5 relative overflow-hidden">
                <ReactFlow 
                    nodes={initialNodes}
                    edges={initialEdges}
                    fitView
                    className="touch-none"
                >
                    <Background color="#333" gap={16} />
                    <Controls className="bg-black/50 border-white/10 fill-white" />
                </ReactFlow>
              </div>
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
