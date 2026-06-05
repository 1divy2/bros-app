import { useGetCicd, getGetCicdQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";

const STAGE_COLORS: Record<string, string> = {
  build: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  test: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  lint: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  security: "border-red-500/40 bg-red-500/10 text-red-400",
  deploy: "border-green-500/40 bg-green-500/10 text-green-400",
  release: "border-amber-500/40 bg-amber-500/10 text-amber-400",
  notify: "border-slate-500/40 bg-slate-500/10 text-slate-400",
};

function formatDuration(ms: number) {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function Cicd() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetCicd(repoId, {
    query: { enabled: !!repoId, queryKey: getGetCicdQueryKey(repoId) },
  });

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading CI/CD pipeline..."
        errorMessage="CI/CD analysis not available."
        queryKeyToInvalidate={getGetCicdQueryKey(repoId)}
        className="h-full w-full overflow-y-auto p-6 relative"
      >
        {data && (
          <div className="space-y-4 relative z-10">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "BUILD SUCCESS RATE", value: `${data.buildSuccessRate.toFixed(1)}%`, color: data.buildSuccessRate >= 95 ? "text-green-400" : data.buildSuccessRate >= 85 ? "text-amber-400" : "text-red-400" },
                { label: "DEPLOY FREQUENCY", value: `${data.deployFrequency.toFixed(1)}/wk`, color: "text-cyan-400" },
                { label: "AVG BUILD TIME", value: formatDuration(data.avgBuildDurationMs), color: "text-foreground" },
                { label: "PROVIDERS", value: data.providers.join(", "), color: "text-muted-foreground" },
              ].map((m) => (
                <div key={m.label} className="border border-border bg-card/30 p-4">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest mb-1">{m.label}</p>
                  <p className={`font-mono font-bold text-lg ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Pipeline Flow */}
            <div className="border border-border bg-card/30 p-4">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-4">PIPELINE TOPOLOGY</p>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {data.stages.map((stage, i) => (
                  <div key={stage.id} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`border p-3 min-w-[140px] ${STAGE_COLORS[stage.type] || "border-border bg-card/30 text-muted-foreground"}`}>
                      <p className="font-mono text-[10px] uppercase font-bold">{stage.name}</p>
                      <p className="font-mono text-[10px] mt-1 opacity-70">
                        {formatDuration(stage.avgDurationMs)} avg
                      </p>
                      <div className="mt-2 w-full h-0.5 bg-black/30">
                        <div className="h-full" style={{
                          width: `${stage.successRate}%`,
                          backgroundColor: stage.successRate >= 95 ? "hsl(142 71% 45%)" : stage.successRate >= 85 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)"
                        }} />
                      </div>
                      <p className="font-mono text-[9px] mt-0.5 opacity-70">{stage.successRate.toFixed(1)}% success</p>
                    </div>
                    {i < data.stages.length - 1 && (
                      <span className="text-muted-foreground font-mono text-lg">→</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Stage Table */}
            <div className="border border-border bg-card/30">
              <div className="border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">STAGE DETAILS</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-2">STAGE</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-2">TYPE</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-2">AVG DURATION</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-2">SUCCESS RATE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stages.map((stage) => (
                    <tr key={stage.id} className="border-b border-border/30 hover:bg-card/20" data-testid={`stage-${stage.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{stage.name}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 border ${STAGE_COLORS[stage.type] || "border-border text-muted-foreground"}`}>
                          {stage.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{formatDuration(stage.avgDurationMs)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1 bg-muted">
                            <div style={{
                              width: `${stage.successRate}%`,
                              height: "100%",
                              backgroundColor: stage.successRate >= 95 ? "hsl(142 71% 45%)" : stage.successRate >= 85 ? "hsl(38 92% 50%)" : "hsl(0 84% 60%)"
                            }} />
                          </div>
                          <span className={`font-mono text-xs ${stage.successRate >= 95 ? "text-green-400" : stage.successRate >= 85 ? "text-amber-400" : "text-red-400"}`}>
                            {stage.successRate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
