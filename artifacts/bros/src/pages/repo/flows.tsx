import { useGetBusinessFlows, getGetBusinessFlowsQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { useState, useMemo } from "react";
import ReactFlow, { Background, Controls, Node, Edge, MarkerType } from "reactflow";
import "reactflow/dist/style.css";

const STEP_COLORS: Record<string, string> = {
  entry: "#10b981",
  process: "#06b6d4",
  decision: "#f59e0b",
  external: "#a855f7",
  exit: "#3b82f6",
};

export default function Flows() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetBusinessFlows(repoId, {
    query: { enabled: !!repoId, queryKey: getGetBusinessFlowsQueryKey(repoId) },
  });
  const [selectedFlow, setSelectedFlow] = useState<string | null>(null);

  const flows = Array.isArray(data) ? data : [];
  const current = flows.find((f) => f.id === selectedFlow) ?? flows[0] ?? null;

  const { rfNodes, rfEdges } = useMemo(() => {
    if (!current) return { rfNodes: [], rfEdges: [] };

    const nodes: Node[] = current.steps.map((step, i) => {
      const color = STEP_COLORS[step.type] || "#64748b";
      return {
        id: step.id,
        data: {
          label: (
            <div className="flex flex-col gap-1 items-center justify-center h-full">
              <span style={{ color, fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {step.type} • {step.service}
              </span>
              <span style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{step.name}</span>
            </div>
          )
        },
        position: { x: 250 + (i % 2 === 0 ? -50 : 50), y: i * 160 }, // gentle zigzag layout
        style: {
          background: `linear-gradient(145deg, rgba(13,14,17,0.95), rgba(10,11,13,0.9))`,
          border: `1px solid ${color}40`,
          borderBottom: `3px solid ${color}`,
          boxShadow: `0 8px 32px -8px ${color}40`,
          backdropFilter: "blur(12px)",
          borderRadius: '8px',
          width: 240,
          padding: '16px 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }
      };
    });

    const edges: Edge[] = current.edges.map((edge) => {
      // Try to determine edge color based on source node type
      const sourceStep = current.steps.find(s => s.id === edge.source);
      const color = sourceStep ? (STEP_COLORS[sourceStep.type] || "#64748b") : "#06b6d4";
      
      return {
        id: `${edge.source}-${edge.target}-${edge.type}`,
        source: edge.source,
        target: edge.target,
        label: edge.type,
        labelStyle: { fill: '#fff', fontWeight: 'bold', fontSize: 10, fontFamily: 'monospace' },
        labelBgStyle: { fill: 'rgba(0,0,0,0.7)', padding: 4 },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        animated: true,
        style: { stroke: color, strokeWidth: 2, filter: `drop-shadow(0 0 4px ${color})` },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: color,
        },
      };
    });

    return { rfNodes: nodes, rfEdges: edges };
  }, [current]);

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={flows.length > 0}
        loadingMessage="Loading business flows..."
        errorMessage="Business flow analysis not available."
        queryKeyToInvalidate={getGetBusinessFlowsQueryKey(repoId)}
        className="h-full w-full flex flex-col overflow-hidden relative"
      >
        {flows.length > 0 && (
          <div className="flex flex-col w-full h-full flex-1">
            {/* Top Bar for Flow Selection */}
            <div className="flex-shrink-0 border-b border-border bg-card/20 z-20 backdrop-blur-md">
              <div className="flex items-center px-6 py-2 border-b border-white/5">
                <p className="font-mono text-[10px] text-primary uppercase tracking-widest font-bold">
                  {flows.length} FLOWS DISCOVERED
                </p>
              </div>
              <div className="flex flex-row overflow-x-auto hide-scrollbar p-2 gap-2">
                {flows.map((flow) => {
                  const isSelected = (selectedFlow ?? flows[0]?.id) === flow.id;
                  return (
                    <button
                      key={flow.id}
                      onClick={() => setSelectedFlow(flow.id)}
                      className={`flex-shrink-0 px-5 py-3 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(0,255,255,0.15)]"
                          : "bg-background/50 border-white/5 hover:bg-white/5 hover:border-white/20"
                      }`}
                      data-testid={`flow-${flow.id}`}
                    >
                      <p className={`font-mono text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {flow.name}
                      </p>
                      <p className="font-mono text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">
                        {flow.steps.length} steps • complexity {flow.complexity}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flow Detail (Main Pane Flowchart) */}
            <div className="flex-1 flex flex-col relative z-10 w-full h-full">
              {current && (
                <div className="flex-1 w-full h-full relative bg-black/40">
                  <ReactFlow 
                      nodes={rfNodes}
                      edges={rfEdges}
                      fitView
                      className="touch-none"
                  >
                      <Background color="#333" gap={16} />
                      <Controls className="bg-black/50 border-white/10 fill-white mb-4 mr-4" />
                  </ReactFlow>
                </div>
              )}
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
