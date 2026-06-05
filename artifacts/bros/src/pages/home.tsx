import { useListRepositories, useCreateRepository, useDeleteRepository, getListRepositoriesQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Terminal, Code2, Trash2, Star, FileText, Layers } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const formSchema = z.object({
  url: z.string().url({ message: "Invalid URL. Provide a valid GitHub repository URL." }),
});

function AnalysisProgress({ progress, module: currentModule }: { progress: number; module: string | null }) {
  return (
    <div className="flex flex-col items-end gap-1 min-w-[180px]">
      <span className="font-mono text-[9px] text-amber-400 uppercase tracking-wider animate-pulse">
        {currentModule?.replace(/-/g, " ") || "INITIALIZING"}
      </span>
      <div className="flex items-center gap-2 w-full justify-end">
        <div className="w-32 h-1 bg-background border border-border relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-amber-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-pulse" />
        </div>
        <span className="font-mono text-[9px] text-amber-400 w-8 text-right">{progress}%</span>
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [booting, setBooting] = useState(false);
  const [bootText, setBootText] = useState<string[]>([]);

  useEffect(() => {
    const hasBooted = sessionStorage.getItem("bros_booted");
    if (!hasBooted) {
      setBooting(true);
      sessionStorage.setItem("bros_booted", "true");

      const sequence = [
        "INIT BIOS v1.4.2",
        "LOADING KERNEL MODULES...",
        "MOUNTING /dev/sda1...",
        "INITIALIZING NEURAL NETWORKS...",
        "ESTABLISHING GITHUB CONNECTION...",
        "brOS SYSTEM READY."
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < sequence.length) {
          setBootText((prev) => [...prev, sequence[i]]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setBooting(false), 500);
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, []);

  const { data: repositories, isLoading } = useListRepositories({
    query: { queryKey: getListRepositoriesQueryKey(), refetchInterval: (query) => {
      const repos = query.state.data;
      if (!repos) return false;
      const hasAnalyzing = repos.some((r: any) => r.status === "analyzing" || r.status === "queued");
      return hasAnalyzing ? 1500 : false;
    }},
  });

  const createRepo = useCreateRepository({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListRepositoriesQueryKey() });
        setLocation(`/repo/${data.id}`);
      }
    }
  });

  const deleteRepo = useDeleteRepository({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRepositoriesQueryKey() });
        setDeletingId(null);
      },
      onError: () => setDeletingId(null),
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createRepo.mutate({ data: values });
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this repository from brOS?")) return;
    setDeletingId(id);
    deleteRepo.mutate({ id });
  }

  const analyzing = repositories?.filter((r) => r.status === "analyzing" || r.status === "queued") ?? [];
  const complete = repositories?.filter((r) => r.status === "complete") ?? [];
  const failed = repositories?.filter((r) => r.status === "failed") ?? [];

  if (booting) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#0a0b0d] text-primary font-mono p-8 flex flex-col gap-2 relative">
        {/* Subtle glow for the boot screen */}
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-2 text-sm tracking-widest uppercase">
          {bootText.map((text, i) => (
            <div key={i} className="animate-in fade-in duration-300 opacity-80">
              <span className="opacity-50 mr-2">&gt;</span> {text}
            </div>
          ))}
          <div className="flex items-center gap-2 mt-2">
            <span className="opacity-50">&gt;</span> <span className="typing-cursor w-2.5 h-4 bg-primary inline-block" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center bg-background text-foreground tech-grid relative overflow-hidden">
      {/* Decorative blurred blobs for depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: "0s" }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: "3s" }} />

      <div className="w-full max-w-4xl pt-20 px-6 pb-12 flex flex-col gap-10 relative z-10">

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4 pt-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          <div className="flex items-center justify-center gap-3 mb-2 p-4 rounded-2xl glass-panel shadow-[0_0_40px_rgba(0,212,255,0.15)] inline-flex relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
            <Terminal className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-4xl font-mono font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
              brOS
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm max-w-lg leading-relaxed bg-black/20 backdrop-blur-sm px-6 py-2 rounded-full border border-white/5">
            Repository intelligence. Paste a GitHub URL to begin analysis.
          </p>
        </div>

        {/* Command Input */}
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 fill-mode-both ease-out">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="relative flex items-center glass-panel rounded-lg focus-within:border-primary/50 focus-within:box-glow transition-all duration-500 overflow-hidden group">
                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/50 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <span className="pl-5 text-primary font-mono font-bold text-lg select-none flex-shrink-0 animate-pulse cyan-glow">
                  &gt;_
                </span>
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <input
                          placeholder="https://github.com/organization/repository"
                          className="w-full h-14 bg-transparent px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 outline-none border-none transition-colors focus:bg-white/[0.02]"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createRepo.isPending}
                  className="h-14 px-8 rounded-none font-mono text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-l border-white/10 transition-all duration-300 flex-shrink-0 backdrop-blur-md"
                >
                  {createRepo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "ANALYZE"}
                </Button>
              </div>
              {form.formState.errors.url && (
                <p className="font-mono text-[10px] mt-1 text-destructive px-1">{form.formState.errors.url.message}</p>
              )}
            </form>
          </Form>
        </div>

        {/* Analyzing banner */}
        {analyzing.length > 0 && (
          <div className="w-full max-w-2xl mx-auto glass-panel border-amber-500/30 bg-amber-500/10 px-5 py-4 rounded-lg flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)] flex-shrink-0" />
            <span className="font-mono text-sm text-amber-300 flex-1 font-medium tracking-wide">
              {analyzing.length} {analyzing.length > 1 ? "repositories" : "repository"} currently analyzing...
            </span>
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
          </div>
        )}

        {/* Repository List */}
        <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-xs font-mono font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Tracked Systems
            </h2>
            <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground glass-panel px-3 py-1.5 rounded-full">
              {analyzing.length > 0 && <span className="text-amber-400 font-bold">{analyzing.length} ANALYZING</span>}
              {complete.length > 0 && <span className="text-green-400 font-bold">{complete.length} COMPLETE</span>}
              {failed.length > 0 && <span className="text-red-400 font-bold">{failed.length} FAILED</span>}
              {!repositories?.length && <span>[0] TRACKED</span>}
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary opacity-50" />
            </div>
          ) : !repositories?.length ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground glass-panel rounded-xl">
              <Code2 className="w-10 h-10 mb-4 opacity-20" />
              <p className="font-mono text-sm text-white/50">No systems connected yet.</p>
              <p className="font-mono text-xs mt-2 opacity-40">Paste a GitHub URL to build your first intelligence map.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {repositories.map((repo, idx) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.1, ease: "easeOut" }}
                >
                  <Link href={`/repo/${repo.id}`} className="group block">
                    <div className={`flex items-center justify-between px-5 py-4 rounded-xl glass-card relative overflow-hidden ${
                      repo.status === "complete"
                        ? "hover:border-primary/50"
                        : repo.status === "failed"
                        ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40"
                        : "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40"
                    }`}>
                      {/* Hover gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                    
                    <div className="flex items-center gap-4 min-w-0 relative z-10">
                      {/* Status indicator */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        repo.status === "complete" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                        repo.status === "failed" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" :
                        "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                      }`} />

                      {/* Repo info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                            {repo.owner}<span className="text-muted-foreground/50 mx-1">/</span>{repo.name}
                          </span>
                          {repo.primaryLanguage && (
                            <span className="font-mono text-[9px] px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-muted-foreground flex-shrink-0">
                              {repo.primaryLanguage.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          {repo.totalFiles != null && (
                            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground/70">
                              <FileText className="w-3 h-3 opacity-70" />
                              {repo.totalFiles.toLocaleString()} files
                            </span>
                          )}
                          {repo.totalLines != null && (
                            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground/70">
                              <Layers className="w-3 h-3 opacity-70" />
                              {repo.totalLines.toLocaleString()} lines
                            </span>
                          )}
                          {repo.stars != null && (
                            <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground/70">
                              <Star className="w-3 h-3 opacity-70" />
                              {repo.stars.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {repo.status === "failed" && (repo as any).errorMessage && (
                          <div className="mt-2 text-[10px] font-mono text-red-400 bg-red-500/10 px-2 py-1 rounded w-fit border border-red-500/20 max-w-full truncate" title={(repo as any).errorMessage}>
                            Error: {(repo as any).errorMessage}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-5 flex-shrink-0 relative z-10">
                      {(repo.status === "analyzing" || repo.status === "queued") && (
                         <AnalysisProgress
                           progress={repo.analysisProgress ?? 0}
                           module={repo.currentModule ?? null}
                         />
                      )}

                      <span className={`font-mono text-[10px] px-2.5 py-1 rounded border font-bold tracking-wider ${
                        repo.status === "complete" ? "border-green-500/30 text-green-400 bg-green-500/10" :
                        repo.status === "failed" ? "border-red-500/30 text-red-400 bg-red-500/10" :
                        "border-amber-500/30 text-amber-400 bg-amber-500/10"
                      }`}>
                        {repo.status.toUpperCase()}
                      </span>

                      <button
                        onClick={(e) => handleDelete(e, repo.id)}
                        disabled={deletingId === repo.id}
                        className="p-2 text-muted-foreground/30 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        title="Remove repository"
                      >
                        {deletingId === repo.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Module overview */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.5 } }
          }}
        >
          {[
            "System Map", "Architecture", "Dependencies", "API Inventory",
            "Database Schema", "Security Audit", "Code Quality", "Infrastructure",
            "CI/CD Pipeline", "Business Flows", "Knowledge Graph", "Docs",
          ].map((label) => (
            <motion.div 
              key={label} 
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              className="glass-panel px-4 py-3 rounded-lg text-center hover:bg-white/5 transition-colors cursor-default"
            >
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">{label}</p>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </div>
  );
}
