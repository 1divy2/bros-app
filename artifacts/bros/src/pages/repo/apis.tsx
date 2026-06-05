import { useGetApiInventory, getGetApiInventoryQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { useState } from "react";

const METHOD_COLORS: Record<string, string> = {
  GET: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_10px_rgba(52,211,153,0.2)]",
  POST: "text-blue-400 border-blue-500/40 bg-blue-500/10 shadow-[0_0_10px_rgba(96,165,250,0.2)]",
  PUT: "text-amber-400 border-amber-500/40 bg-amber-500/10 shadow-[0_0_10px_rgba(251,191,36,0.2)]",
  PATCH: "text-amber-400 border-amber-500/40 bg-amber-500/10 shadow-[0_0_10px_rgba(251,191,36,0.2)]",
  DELETE: "text-rose-400 border-rose-500/40 bg-rose-500/10 shadow-[0_0_10px_rgba(251,113,133,0.2)]",
  OPTIONS: "text-slate-400 border-slate-500/40 bg-slate-500/10",
  HEAD: "text-slate-400 border-slate-500/40 bg-slate-500/10",
};

const TYPE_BADGE: Record<string, string> = {
  REST: "text-cyan-400 border-cyan-500/40 bg-cyan-500/5",
  GraphQL: "text-purple-400 border-purple-500/40 bg-purple-500/5",
  WebSocket: "text-amber-400 border-amber-500/40 bg-amber-500/5",
};

export default function APIs() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetApiInventory(repoId, {
    query: { enabled: !!repoId, queryKey: getGetApiInventoryQueryKey(repoId) },
  });
  const [filter, setFilter] = useState<string>("ALL");

  const filtered = data?.endpoints.filter((e) =>
    filter === "ALL" ? true : e.type === filter
  );

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading API inventory..."
        errorMessage="API inventory not available."
        queryKeyToInvalidate={getGetApiInventoryQueryKey(repoId)}
        className="h-full w-full overflow-y-auto"
      >
        {data && (
          <>
            {/* Stats Bar */}
            <div className="border-b border-border px-6 py-3 flex items-center gap-8 bg-card/20">
              {[
                { label: "TOTAL", value: data.totalCount, color: "text-foreground" },
                { label: "REST", value: data.restCount, color: "text-blue-400" },
                { label: "GRAPHQL", value: data.graphqlCount, color: "text-purple-400" },
                { label: "WEBSOCKET", value: data.websocketCount, color: "text-amber-400" },
                { label: "AUTHENTICATED", value: data.authenticatedCount, color: "text-green-400" },
                { label: "UNAUTHENTICATED", value: data.totalCount - data.authenticatedCount, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">{s.label}</span>
                  <span className={`font-mono font-bold text-xl ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-border px-6 py-2 flex items-center gap-2">
              {["ALL", "REST", "GraphQL", "WebSocket"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`font-mono text-[10px] uppercase px-3 py-1 border rounded-sm transition-colors ${
                    filter === t
                      ? "border-primary text-primary bg-primary/10 shadow-[0_0_10px_rgba(59,130,246,0.15)]"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                  data-testid={`filter-${t.toLowerCase()}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Endpoint Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-6 py-3 tracking-widest w-24">METHOD</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest">PATH</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest w-24">TYPE</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest w-24">AUTH</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest">DESCRIPTION</th>
                    <th className="text-left font-mono text-[9px] text-muted-foreground uppercase px-4 py-3 tracking-widest">TAGS</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((ep) => (
                    <tr
                      key={ep.id}
                      className="border-b border-border/50 hover:bg-card/30 transition-colors group"
                      data-testid={`endpoint-${ep.id}`}
                    >
                      <td className="px-6 py-3">
                        <span className={`w-16 text-center inline-block font-mono text-[10px] font-bold px-2 py-1 rounded-md border transition-all duration-300 group-hover:scale-105 ${METHOD_COLORS[ep.method] || "text-slate-400 border-slate-500/40 bg-slate-500/10"}`}>
                          {ep.method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-foreground/90 font-medium group-hover:text-primary transition-colors">{ep.path}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${TYPE_BADGE[ep.type] || "text-muted-foreground border-border"}`}>
                          {ep.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-[10px] ${ep.authenticated ? "text-green-400" : "text-red-400"}`}>
                          {ep.authenticated ? "JWT" : "OPEN"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{ep.description || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {ep.tags?.map((tag) => (
                            <span key={tag} className="font-mono text-[9px] px-1 border border-border text-muted-foreground">{tag}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
