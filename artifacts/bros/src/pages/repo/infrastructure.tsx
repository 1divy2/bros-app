import { useGetInfrastructure, getGetInfrastructureQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { Server, Database, Network, HardDrive, GitBranch, Boxes, Container } from "lucide-react";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  container: <Container className="w-4 h-4" />,
  service: <Server className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  network: <Network className="w-4 h-4" />,
  loadbalancer: <GitBranch className="w-4 h-4" />,
  storage: <HardDrive className="w-4 h-4" />,
  queue: <Boxes className="w-4 h-4" />,
  registry: <Boxes className="w-4 h-4" />,
};

const TYPE_COLORS: Record<string, string> = {
  container: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  service: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
  database: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  network: "text-slate-400 border-slate-500/40 bg-slate-500/10",
  loadbalancer: "text-purple-400 border-purple-500/40 bg-purple-500/10",
  storage: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  queue: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  registry: "text-slate-400 border-slate-500/40 bg-slate-500/10",
};

export default function Infrastructure() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetInfrastructure(repoId, {
    query: { enabled: !!repoId, queryKey: getGetInfrastructureQueryKey(repoId) },
  });

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading infrastructure..."
        errorMessage="Infrastructure analysis not available."
        queryKeyToInvalidate={getGetInfrastructureQueryKey(repoId)}
        className="h-full w-full overflow-y-auto p-6 relative"
      >
        {data && (
          <div className="space-y-4 relative z-10">
            {/* Tech Stack Flags */}
            <div className="flex items-center gap-3 flex-wrap">
              {[
                { label: "DOCKER", active: data.hasDocker },
                { label: "KUBERNETES", active: data.hasKubernetes },
                { label: "TERRAFORM", active: data.hasTerraform },
                { label: "HELM", active: data.hasHelm },
              ].map((f) => (
                <div key={f.label} className={`font-mono text-xs px-3 py-1.5 border font-bold ${
                  f.active ? "border-primary/50 text-primary bg-primary/10" : "border-border text-muted-foreground/40"
                }`}>
                  {f.label} {f.active ? "DETECTED" : "NOT FOUND"}
                </div>
              ))}
            </div>

            {/* Node Grid */}
            <div className="border border-border bg-card/30">
              <div className="border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  INFRASTRUCTURE NODES ({data.nodes.length})
                </p>
              </div>
              <div className="grid grid-cols-3 gap-px bg-border">
                {data.nodes.map((node) => {
                  const cfg = TYPE_COLORS[node.type] || "text-muted-foreground border-border";
                  return (
                    <div key={node.id} className="bg-background p-4 hover:bg-card/50 transition-colors" data-testid={`infra-${node.id}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 border ${cfg} flex-shrink-0`}>
                          {TYPE_ICONS[node.type] || <Server className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono font-bold text-sm text-foreground truncate">{node.name}</p>
                          <p className="font-mono text-[10px] text-muted-foreground uppercase">{node.type}</p>
                          <p className="font-mono text-[10px] text-muted-foreground mt-1">{node.technology}</p>
                          <div className="flex items-center gap-3 mt-2">
                            {node.replicas != null && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {node.replicas}x REPLICA
                              </span>
                            )}
                            {node.ports && node.ports.length > 0 && (
                              <div className="flex gap-1">
                                {node.ports.map((p) => (
                                  <span key={p} className="font-mono text-[9px] px-1 border border-border text-muted-foreground">:{p}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connections */}
            <div className="border border-border bg-card/30">
              <div className="border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  SERVICE CONNECTIONS ({data.edges.length})
                </p>
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                {data.edges.map((e, i) => (
                  <div key={i} className="bg-background px-4 py-2 flex items-center gap-3">
                    <span className="font-mono text-xs text-foreground">{e.source}</span>
                    <span className="font-mono text-[10px] px-1.5 border border-border text-muted-foreground">{e.type}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-mono text-xs text-foreground">{e.target}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
