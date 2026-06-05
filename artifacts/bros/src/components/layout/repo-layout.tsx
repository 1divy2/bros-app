import { useGetRepository, getGetRepositoryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { 
  Network, 
  Layers, 
  Workflow, 
  Database, 
  ShieldAlert, 
  Activity, 
  Server, 
  GitCommit, 
  GitMerge,
  Cpu,
  BookOpen,
  TerminalSquare,
  RefreshCcw,
  ArrowLeft,
  Star,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RepoLayoutProps {
  id: string;
  children: React.ReactNode;
}

const MODULES = [
  { id: "", name: "SYSTEM MAP", icon: Network },
  { id: "/architecture", name: "ARCHITECTURE", icon: Layers },
  { id: "/dependencies", name: "DEPENDENCIES", icon: Workflow },
  { id: "/apis", name: "APIS", icon: TerminalSquare },
  { id: "/databases", name: "DATABASES", icon: Database },
  { id: "/security", name: "SECURITY", icon: ShieldAlert },
  { id: "/quality", name: "QUALITY", icon: Activity },
  { id: "/infrastructure", name: "INFRASTRUCTURE", icon: Server },
  { id: "/cicd", name: "CI/CD", icon: GitCommit },
  { id: "/flows", name: "BUSINESS FLOWS", icon: GitMerge },
  { id: "/knowledge", name: "KNOWLEDGE GRAPH", icon: Cpu },
  { id: "/docs", name: "DOCS", icon: BookOpen },
];

export function RepoLayout({ id, children }: RepoLayoutProps) {
  const [location] = useLocation();
  const repoId = parseInt(id, 10);
  const { data: repo, isLoading } = useGetRepository(repoId);
  const queryClient = useQueryClient();
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const currentPath = location.replace(`/repo/${id}`, "");

  const handleReanalyze = async () => {
    try {
      setIsReanalyzing(true);
      const res = await fetch(`/api/repositories/${repoId}/analyze`, { method: "POST" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: getGetRepositoryQueryKey(repoId) });
      }
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background"><span className="font-mono text-primary animate-pulse">CONNECTING...</span></div>;
  }

  if (!repo) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background text-destructive font-mono">SYSTEM NOT FOUND.</div>;
  }

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Vertical Rail Navigation */}
      <nav className="w-16 md:w-64 border-r border-white/10 bg-background/40 backdrop-blur-xl flex flex-col flex-shrink-0 z-20">
        <div className="h-14 border-b border-white/10 flex items-center justify-center md:justify-start md:px-6">
          <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden md:inline font-mono text-xs font-bold tracking-widest uppercase">brOS</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1">
          {MODULES.map((mod) => {
            const isActive = currentPath === mod.id || (currentPath === "" && mod.id === "");
            const Icon = mod.icon;
            return (
              <Link 
                key={mod.id} 
                href={`/repo/${id}${mod.id}`}
                className={cn(
                  "flex items-center gap-3 px-0 md:px-4 py-3 mx-2 md:mx-3 transition-all duration-300 rounded-lg group relative overflow-hidden",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 box-glow" 
                    : "border border-transparent text-muted-foreground/70 hover:text-white hover:bg-white/5 hover:border-white/10"
                )}
                title={mod.name}
              >
                {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-primary cyan-glow animate-pulse" />}
                <Icon className={cn("w-4 h-4 mx-auto md:mx-0 flex-shrink-0 transition-transform duration-300", isActive ? "scale-110 cyan-glow" : "group-hover:scale-110")} />
                <span className={cn("hidden md:inline font-mono text-[10px] font-bold tracking-widest transition-colors", isActive ? "text-primary cyan-glow" : "group-hover:text-white")}>{mod.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Tight Header Bar */}
        <header className="h-14 border-b border-white/5 bg-background/60 backdrop-blur-xl flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-4">
            <span className="font-mono font-bold text-sm tracking-tight text-foreground flex items-center">
              <span className="text-white/60">{repo.owner}</span>
              <span className="text-white/30 mx-2">/</span> 
              <span className="text-primary tracking-wide">{repo.name}</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
              {repo.primaryLanguage || 'UNKNOWN'}
            </span>
          </div>
          
          <div className="flex items-center gap-5 font-mono text-[10px] text-muted-foreground/70 tracking-widest">
            <div className="flex items-center gap-2 px-2 py-1 bg-black/20 rounded border border-white/5">
              <span className="uppercase text-[9px]">STATUS</span>
              <span className={cn(
                "font-bold text-[10px]",
                repo.status === 'complete' ? "text-green-400" :
                repo.status === 'failed' ? "text-red-400" : "text-amber-400 animate-pulse"
              )}>{repo.status.toUpperCase()}</span>
            </div>
            {(repo.status === 'complete' || repo.status === 'failed') && (
              <button 
                onClick={handleReanalyze} 
                disabled={isReanalyzing}
                className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded border border-primary/20 transition-colors disabled:opacity-50 cursor-pointer"
                title="Re-run Analysis"
              >
                <RefreshCcw className={cn("w-3 h-3", isReanalyzing && "animate-spin")} />
                <span className="text-[9px] uppercase font-bold tracking-widest hidden md:inline">RE-ANALYZE</span>
              </button>
            )}
            {repo.stars != null && (
              <span className="hidden md:flex items-center gap-1.5"><Star className="w-3 h-3 opacity-60" /> {repo.stars.toLocaleString()}</span>
            )}
            {repo.forks != null && (
              <span className="hidden md:flex items-center gap-1.5"><GitMerge className="w-3 h-3 opacity-60" /> {repo.forks.toLocaleString()}</span>
            )}
            {repo.license && (
              <span className="hidden md:inline border border-white/10 bg-white/5 px-2 py-0.5 rounded text-[9px]">{repo.license}</span>
            )}
            <span className="flex items-center gap-1.5"><FileText className="w-3 h-3 opacity-60" /> {repo.totalFiles?.toLocaleString() || 0}</span>
            <span className="flex items-center gap-1.5"><Layers className="w-3 h-3 opacity-60" /> {repo.totalLines?.toLocaleString() || 0}</span>
          </div>
        </header>

        {/* Render Page Content */}
        <div className="flex-1 overflow-hidden relative tech-grid">
          {children}
        </div>
      </main>

    </div>
  );
}
