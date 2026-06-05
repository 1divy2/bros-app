import { useGetQuality, getGetQualityQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";

const ISSUE_COLORS: Record<string, string> = {
  "code-smell": "text-amber-400 border-amber-500/40 bg-amber-500/10",
  "dead-code": "text-slate-400 border-slate-500/40 bg-slate-500/10",
  "large-method": "text-orange-400 border-orange-500/40 bg-orange-500/10",
  "large-class": "text-red-400 border-red-500/40 bg-red-500/10",
  "duplicate": "text-purple-400 border-purple-500/40 bg-purple-500/10",
};

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export default function Quality() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetQuality(repoId, {
    query: { enabled: !!repoId, queryKey: getGetQualityQueryKey(repoId) },
  });

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading code quality..."
        errorMessage="Quality analysis not available."
        queryKeyToInvalidate={getGetQualityQueryKey(repoId)}
        className="h-full w-full overflow-y-auto p-6 relative"
      >
        {data && (
          <div className="space-y-4 relative z-10">
            {/* Overall Score */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 border border-border bg-card/30 p-6 flex flex-col items-center justify-center">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">QUALITY SCORE</p>
                <p className={`font-mono font-bold text-5xl ${scoreColor(data.overallScore)}`}>
                  {data.overallScore.toFixed(1)}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">/ 100</p>
                <div className="mt-4 w-full h-2 bg-muted">
                  <motion.div className={`h-full ${data.overallScore >= 80 ? "bg-green-500" : data.overallScore >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.overallScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Complexity Distribution */}
              <div className="col-span-9 border border-border bg-card/30 p-4">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-3">COMPLEXITY DISTRIBUTION</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={data.complexityDistribution} barSize={32}>
                    <XAxis dataKey="range" tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: "hsl(215 20% 65%)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, fill: "hsl(215 20% 65%)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(222 13% 7%)", border: "1px solid hsl(215 14% 15%)", fontFamily: "JetBrains Mono, monospace", fontSize: 11 }}
                      labelStyle={{ color: "hsl(210 40% 98%)" }}
                    />
                    <Bar dataKey="count" radius={0}>
                      {data.complexityDistribution.map((_, i) => (
                        <Cell key={i} fill={i < 2 ? "hsl(142 71% 45%)" : i < 3 ? "hsl(38 92% 50%)" : i < 4 ? "hsl(0 84% 60%)" : "hsl(0 84% 40%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Hotspots */}
            <div className="border border-border bg-card/30">
              <div className="border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">RISK HOTSPOTS</p>
              </div>
              <div className="divide-y divide-border/50">
                {data.hotspots.map((h, i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-card/50">
                    <span className="font-mono text-[10px] text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                    <code className="font-mono text-xs text-foreground flex-1">{h.file}</code>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1 bg-muted">
                        <motion.div className={`h-full ${h.score >= 70 ? "bg-green-500" : h.score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${h.score}%` }}
                          transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                        />
                      </div>
                      <span className={`font-mono text-xs w-10 text-right ${scoreColor(h.score)}`}>{h.score.toFixed(0)}</span>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground w-16 text-right">{h.issues} ISSUES</span>
                  </div>
                ))}
              </div>
            </div>

            {/* File-level Metrics */}
            <div className="border border-border bg-card/30">
              <div className="border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">FILE ANALYSIS</p>
              </div>
              <div className="divide-y divide-border/50">
                {data.metrics.map((m, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="font-mono text-xs text-foreground">{m.file}</code>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-[10px] text-muted-foreground">COMPLEXITY: <span className="text-foreground">{m.complexity}</span></span>
                        <span className="font-mono text-[10px] text-muted-foreground">MAINTAINABILITY: <span className={scoreColor(m.maintainabilityIndex)}>{m.maintainabilityIndex.toFixed(1)}</span></span>
                      </div>
                    </div>
                    {m.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.issues.map((issue, j) => (
                          <span key={j} className={`font-mono text-[9px] px-1.5 py-0.5 border ${ISSUE_COLORS[issue.type] || "text-muted-foreground border-border"}`}>
                            {issue.type} L{issue.line}
                          </span>
                        ))}
                      </div>
                    )}
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
