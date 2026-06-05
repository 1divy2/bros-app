import { useGetDocs, getGetDocsQueryKey } from "@workspace/api-client-react";
import { RepoLayout } from "@/components/layout/repo-layout";
import { RepoPageWrapper } from "@/components/layout/repo-page-wrapper";
import { useParams } from "wouter";
import { Download } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/atom-one-dark.css";

const SECTION_TYPES = [
  { type: "overview", label: "OVERVIEW" },
  { type: "architecture", label: "ARCHITECTURE" },
  { type: "api", label: "API REFERENCE" },
  { type: "database", label: "DATABASE" },
  { type: "deployment", label: "DEPLOYMENT" },
  { type: "onboarding", label: "ONBOARDING" },
];

export default function Docs() {
  const params = useParams();
  const repoId = parseInt(params.id || "0", 10);
  const { data, isLoading, error } = useGetDocs(repoId, {
    query: { enabled: !!repoId, queryKey: getGetDocsQueryKey(repoId) },
  });
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = data?.sections ?? [];
  const current = sections.find((s) => s.id === activeSection) ?? sections[0];

  return (
    <RepoLayout id={params.id!}>
      <RepoPageWrapper
        isLoading={isLoading}
        error={error}
        hasData={sections.length > 0}
        loadingMessage="Loading documentation..."
        errorMessage="Documentation not available."
        queryKeyToInvalidate={getGetDocsQueryKey(repoId)}
        className="h-full w-full flex overflow-hidden relative"
      >
        {sections.length > 0 && (
          <div className="flex flex-row w-full h-full relative">
            {/* Section Nav */}
            <div className="w-56 border-r border-white/10 flex-shrink-0 flex flex-col bg-background/60 backdrop-blur-md relative z-10">
              <div className="border-b border-white/10 px-4 py-3">
                <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                  GENERATED DOCS
                </p>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {sections.map((section) => {
                  const typeInfo = SECTION_TYPES.find((t) => t.type === section.type);
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full text-left px-5 py-3 border-b border-white/5 hover:bg-white/5 transition-all duration-300 relative ${
                        (activeSection ?? sections[0]?.id) === section.id
                          ? "bg-primary/10 text-white"
                          : "text-muted-foreground hover:text-white"
                      }`}
                      data-testid={`doc-${section.id}`}
                    >
                      {(activeSection ?? sections[0]?.id) === section.id && (
                        <div className="absolute inset-y-0 left-0 w-1 bg-primary shadow-[0_0_10px_rgba(0,212,255,0.8)]" />
                      )}
                      <p className="font-mono text-[10px] uppercase opacity-60 mb-1">{typeInfo?.label ?? section.type}</p>
                      <p className="font-mono text-xs font-bold truncate">{section.title}</p>
                    </button>
                  );
                })}
              </div>
              {data?.generatedAt && (
                <div className="border-t border-white/10 px-5 py-4">
                  <p className="font-mono text-[9px] text-muted-foreground uppercase opacity-60">GENERATED</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1 font-bold">
                    {new Date(data.generatedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Doc Content */}
            <div className="flex-1 overflow-y-auto bg-card/20 relative z-10">
              {/* Decorative blob for docs content area */}
              <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
              
              {current && (
                <div className="p-10 max-w-4xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
                    <div>
                      <span className="font-mono text-[10px] text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                        {SECTION_TYPES.find((t) => t.type === current.type)?.label ?? current.type}
                      </span>
                      <h1 className="font-mono font-black text-3xl text-foreground mt-4 tracking-tight">{current.title}</h1>
                    </div>
                    <button
                      onClick={() => {
                        const blob = new Blob([current.content], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${current.id}.md`;
                        a.click();
                      }}
                      className="flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/50 hover:text-primary transition-all duration-300"
                      data-testid="export-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      EXPORT MD
                    </button>
                  </div>
                  
                  <div className="prose prose-invert prose-sm max-w-none font-sans
                    prose-headings:font-mono prose-headings:font-bold prose-headings:text-white
                    prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
                    prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:text-[13px]
                    prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[11px] prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-[#1e1e1e] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-lg prose-pre:shadow-xl
                    prose-table:font-mono prose-table:text-xs prose-td:border-white/10 prose-th:border-white/10 prose-th:text-white/60 prose-th:bg-white/5
                    prose-strong:text-white prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-hr:border-white/10 prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-muted-foreground">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {current.content}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </RepoPageWrapper>
    </RepoLayout>
  );
}
