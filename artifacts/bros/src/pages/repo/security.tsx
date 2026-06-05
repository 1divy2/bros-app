import { useGetSecurity, getGetSecurityQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/40", bar: "bg-red-500" },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/40", bar: "bg-orange-500" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/40", bar: "bg-amber-500" },
  low: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/40", bar: "bg-blue-500" },
  info: { color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/40", bar: "bg-slate-500" },
};

const CATEGORY_LABELS: Record<string, string> = {
  "hardcoded-secret": "HARDCODED SECRET",
  "weak-auth": "WEAK AUTH",
  "missing-validation": "MISSING VALIDATION",
  "exposed-credential": "EXPOSED CREDENTIAL",
  "unsafe-endpoint": "UNSAFE ENDPOINT",
  "dependency-vulnerability": "DEP VULNERABILITY",
  "other": "OTHER",
};

export default function Security() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetSecurity(repoId, {
    query: { enabled: !!repoId, queryKey: getGetSecurityQueryKey(repoId) },
  });

  const riskColor = !data ? "text-muted-foreground"
    : data.riskScore >= 75 ? "text-red-400"
    : data.riskScore >= 50 ? "text-amber-400"
    : data.riskScore >= 25 ? "text-yellow-400"
    : "text-green-400";

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={!!data}
        loadingMessage="Loading security analysis..."
        errorMessage="Security analysis not available."
        queryKeyToInvalidate={getGetSecurityQueryKey(repoId)}
        className="h-full w-full overflow-y-auto p-6 relative"
      >
        {data && (
          <div className="space-y-4 relative z-10">
            {/* Risk Score Header */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 border border-border bg-card/30 p-6 flex flex-col items-center justify-center">
                <ShieldAlert className={`w-8 h-8 mb-3 ${riskColor}`} />
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest mb-2">RISK SCORE</p>
                <p className={`font-mono font-bold text-5xl ${riskColor}`}>{data.riskScore}</p>
                <p className="font-mono text-[10px] text-muted-foreground mt-1">/ 100</p>
                <div className="mt-4 w-full h-2 bg-muted">
                  <motion.div className={`h-full transition-all ${data.riskScore >= 75 ? "bg-red-500" : data.riskScore >= 50 ? "bg-amber-500" : "bg-green-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${data.riskScore}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="col-span-9 grid grid-cols-4 gap-4">
                {[
                  { label: "CRITICAL", count: data.criticalCount, sev: "critical" as const },
                  { label: "HIGH", count: data.highCount, sev: "high" as const },
                  { label: "MEDIUM", count: data.mediumCount, sev: "medium" as const },
                  { label: "LOW", count: data.lowCount, sev: "low" as const },
                ].map((s) => (
                  <div key={s.label} className={`border ${SEVERITY_CONFIG[s.sev].border} ${SEVERITY_CONFIG[s.sev].bg} p-4 flex flex-col items-center justify-center`}>
                    <span className={`font-mono font-bold text-3xl ${SEVERITY_CONFIG[s.sev].color}`}>{s.count}</span>
                    <span className={`font-mono text-[10px] uppercase mt-1 ${SEVERITY_CONFIG[s.sev].color}`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings */}
            <div className="border border-border bg-card/30">
              <div className="border-b border-border px-4 py-2">
                <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                  FINDINGS ({data.findings.length})
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {data.findings.map((f, i) => {
                  const cfg = SEVERITY_CONFIG[f.severity];
                  return (
                    <motion.div 
                      key={f.id} 
                      className="p-4 hover:bg-card/50 transition-colors" 
                      data-testid={`finding-${f.id}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 mt-0.5 px-2 py-0.5 border text-[10px] font-mono font-bold ${cfg.color} ${cfg.border} ${cfg.bg}`}>
                          {f.severity.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-mono font-bold text-sm text-foreground">{f.title}</span>
                            <span className="font-mono text-[9px] px-1.5 border border-border text-muted-foreground">
                              {CATEGORY_LABELS[f.category] || f.category}
                            </span>
                            <span className="font-mono text-[9px] text-muted-foreground">{f.id}</span>
                          </div>
                          <p className="font-mono text-xs text-muted-foreground mb-2">{f.description}</p>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-muted-foreground">LOCATION:</span>
                            <code className="font-mono text-[10px] text-cyan-400 bg-background px-2 py-0.5 border border-border/50">{f.location}</code>
                          </div>
                          {f.mitigation && (
                            <div className="mt-2 border-l-2 border-green-500/40 pl-3">
                              <p className="font-mono text-[10px] text-muted-foreground uppercase mb-0.5">MITIGATION</p>
                              <p className="font-mono text-xs text-green-400">{f.mitigation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
