import { useGetKnowledgeGraph, getGetKnowledgeGraphQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

const CATEGORY_COLORS: Record<string, { dot: string; badge: string; hex: string }> = {
  repository: { dot: "bg-cyan-400", badge: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10", hex: "#22d3ee" },
  service: { dot: "bg-blue-400", badge: "text-blue-400 border-blue-500/40 bg-blue-500/10", hex: "#60a5fa" },
  api: { dot: "bg-green-400", badge: "text-green-400 border-green-500/40 bg-green-500/10", hex: "#4ade80" },
  class: { dot: "bg-purple-400", badge: "text-purple-400 border-purple-500/40 bg-purple-500/10", hex: "#c084fc" },
  method: { dot: "bg-slate-400", badge: "text-slate-400 border-slate-500/40 bg-slate-500/10", hex: "#94a3b8" },
  database: { dot: "bg-emerald-400", badge: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10", hex: "#34d399" },
  pipeline: { dot: "bg-amber-400", badge: "text-amber-400 border-amber-500/40 bg-amber-500/10", hex: "#fbbf24" },
  infrastructure: { dot: "bg-red-400", badge: "text-red-400 border-red-500/40 bg-red-500/10", hex: "#f87171" },
};

function ForceGraph({ data, selectedId, onSelect }: { data: any, selectedId: string | null, onSelect: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !containerRef.current) return;
    
    // Create an observer to rebuild graph when container gets its size
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries.length) return;
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;

      d3.select(containerRef.current).selectAll("*").remove();

      const svg = d3.select(containerRef.current)
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .style("position", "absolute")
        .style("top", 0)
        .style("left", 0);

      const g = svg.append("g");

      svg.call(d3.zoom().on("zoom", (e) => {
          g.attr("transform", e.transform);
      }) as any);

      const nodes = data.nodes.map((d: any) => ({ ...d }));
      const links = data.edges.map((d: any) => ({ ...d }));

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d: any) => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(40));

      const link = g.append("g")
        .attr("stroke", "#ffffff20")
        .attr("stroke-width", 1.5)
        .selectAll("line")
        .data(links)
        .join("line");

      const node = g.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .attr("cursor", "pointer")
        .on("click", (e, d: any) => onSelect(d.id))
        .call(d3.drag()
          .on("start", (e, d: any) => {
            if (!e.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d: any) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d: any) => {
            if (!e.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any);

      const isNodeSelected = (d: any) => selectedId === d.id;
      const isNodeConnected = (d: any) => {
        if (!selectedId) return true;
        if (selectedId === d.id) return true;
        return links.some((l: any) => 
          (l.source.id === selectedId && l.target.id === d.id) || 
          (l.target.id === selectedId && l.source.id === d.id)
        );
      };

      node.append("circle")
        .attr("r", (d: any) => isNodeSelected(d) ? 20 : 12)
        .attr("fill", (d: any) => CATEGORY_COLORS[d.category]?.hex || "#94a3b8")
        .attr("stroke", (d: any) => isNodeSelected(d) ? "#fff" : "transparent")
        .attr("stroke-width", 3)
        .style("opacity", (d: any) => isNodeConnected(d) ? 1 : 0.2)
        .style("filter", (d: any) => isNodeConnected(d) ? `drop-shadow(0 0 12px ${CATEGORY_COLORS[d.category]?.hex || "#94a3b8"})` : "none");

      node.append("text")
        .attr("dx", 20)
        .attr("dy", 4)
        .text((d: any) => d.label)
        .attr("fill", (d: any) => isNodeSelected(d) ? "#fff" : "#cbd5e1")
        .attr("font-size", (d: any) => isNodeSelected(d) ? "14px" : "10px")
        .attr("font-family", "monospace")
        .attr("font-weight", (d: any) => isNodeSelected(d) ? "bold" : "normal")
        .style("opacity", (d: any) => isNodeConnected(d) ? 1 : 0.2)
        .style("pointer-events", "none");

      link.style("opacity", (l: any) => {
        if (!selectedId) return 1;
        if (l.source.id === selectedId || l.target.id === selectedId) return 1;
        return 0.1;
      });

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    });

    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
      // Remove any simulation left running
      d3.select(containerRef.current).selectAll("*").remove();
    };
  }, [data, selectedId, onSelect]);

  return <div ref={containerRef} className="absolute inset-0 z-0 bg-gradient-to-br from-black to-slate-900" />;
}

export default function Knowledge() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetKnowledgeGraph(repoId, {
    query: { enabled: !!repoId, queryKey: getGetKnowledgeGraphQueryKey(repoId) },
  });
  const [selected, setSelected] = useState<string | null>(null);
  const categories = Array.from(new Set(data?.nodes.map((n: any) => n.category) ?? [])) as string[];
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  useEffect(() => {
    if (categories.length > 0 && !categoryFilter) {
      setCategoryFilter(categories[0]);
    }
  }, [categories, categoryFilter]);

  const selectedNode = data?.nodes.find((n: any) => n.id === selected);
  const connectedEdges = data?.edges.filter((e: any) => e.source === selected || e.target === selected) ?? [];
  const connectedNodeIds = new Set(connectedEdges.flatMap((e: any) => [e.source, e.target]).filter((id) => id !== selected));

  const filtered = data?.nodes.filter((n: any) => n.category === categoryFilter) ?? [];

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading knowledge graph..."
        errorMessage="Knowledge graph not available."
        queryKeyToInvalidate={getGetKnowledgeGraphQueryKey(repoId)}
        className="h-full w-full flex overflow-hidden relative"
      >
        {data && (
          <div className="flex flex-row w-full h-full relative">
            {/* Left Sidebar */}
            <div className="w-80 border-r border-border flex-shrink-0 flex flex-col bg-card/40 backdrop-blur-md relative z-10 shadow-2xl">
              <div className="border-b border-border px-6 py-4 bg-background/50">
                <p className="font-mono text-[10px] text-primary uppercase tracking-widest font-bold">
                  {data.totalNodes} NODES • {data.totalEdges} EDGES
                </p>
              </div>

              {/* Category filter */}
              <div className="border-b border-border px-4 py-3 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`font-mono text-[9px] font-bold uppercase px-2.5 py-1 rounded transition-colors ${
                      categoryFilter === cat
                        ? "text-primary bg-primary/20 border border-primary/50"
                        : "text-muted-foreground hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">
                {filtered.map((node: any) => {
                  const cfg = CATEGORY_COLORS[node.category];
                  const isSelected = selected === node.id;
                  const isConnected = connectedNodeIds.has(node.id);
                  const connectionsCount = data.edges.filter((e: any) => 
                    (typeof e.source === 'object' ? e.source.id : e.source) === node.id || 
                    (typeof e.target === 'object' ? e.target.id : e.target) === node.id
                  ).length;
                  
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelected(isSelected ? null : node.id)}
                      className={`w-full text-left px-6 py-3 border-b border-border/30 transition-all ${
                        isSelected ? "bg-primary/10 border-l-4 border-l-primary" :
                        isConnected ? "bg-white/5 border-l-4 border-l-cyan-500/50" :
                        "hover:bg-white/5 border-l-4 border-l-transparent"
                      }`}
                      data-testid={`knode-${node.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg?.dot || "bg-muted"}`} />
                        <span className="font-mono text-sm font-bold text-foreground truncate">{node.label}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 ml-5">
                        <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded border ${cfg?.badge || "text-muted-foreground border-border"}`}>
                          {node.category}
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground uppercase">{connectionsCount} links</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* D3 Force Graph Container */}
            <div className="flex-1 relative overflow-hidden bg-black">
              {categoryFilter !== "domain" ? (
                <ForceGraph data={data} selectedId={selected} onSelect={setSelected} />
              ) : (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-black to-slate-900 flex items-center justify-center">
                  <p className="font-mono text-muted-foreground/50 text-sm tracking-widest uppercase">Diagram Hidden for Domain View</p>
                </div>
              )}

              {/* Floating Details Panel */}
              {selectedNode && (
                <div className="absolute top-6 right-6 w-96 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl z-20 pointer-events-auto">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-mono font-bold text-2xl text-white break-words">{selectedNode.label}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        {(() => {
                          const cfg = CATEGORY_COLORS[selectedNode.category];
                          return <span className={`font-mono text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${cfg?.badge || "text-muted-foreground border-border"}`}>{selectedNode.category}</span>;
                        })()}
                        <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{selectedNode.connections} Connections</span>
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-white/50 hover:text-white transition-colors">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {connectedEdges.length > 0 && (
                    <div className="mt-6 border-t border-white/10 pt-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                      <p className="font-mono text-[10px] text-primary uppercase tracking-widest font-bold mb-3">Relationships</p>
                      <div className="space-y-2">
                        {connectedEdges.map((e, i) => {
                          const isSource = e.source === selected;
                          const otherId = isSource ? e.target : e.source;
                          const otherNode = data.nodes.find((n) => n.id === otherId);
                          const cfg = otherNode ? CATEGORY_COLORS[otherNode.category] : null;
                          return (
                            <button
                              key={i}
                              onClick={() => setSelected(otherId)}
                              className="w-full flex items-center gap-3 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                            >
                              <span className="font-mono text-[12px] text-muted-foreground w-4">{isSource ? "→" : "←"}</span>
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-white/70 uppercase">{e.type}</span>
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg?.dot || "bg-muted"}`} />
                                <span className="font-mono text-xs text-white truncate font-medium">{otherNode?.label ?? otherId}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
