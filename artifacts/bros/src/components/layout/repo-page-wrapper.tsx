import React from "react";
import { Loader2, RefreshCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface RepoPageWrapperProps {
  isLoading: boolean;
  error: any;
  hasData: boolean;
  loadingMessage?: string;
  errorMessage?: string;
  queryKeyToInvalidate?: readonly unknown[];
  className?: string;
  children: React.ReactNode;
}

export function RepoPageWrapper({
  isLoading,
  error,
  hasData,
  loadingMessage = "Loading analysis data...",
  errorMessage = "Analysis not available.",
  queryKeyToInvalidate,
  className = "h-full w-full overflow-y-auto p-8 relative",
  children,
}: RepoPageWrapperProps) {
  const queryClient = useQueryClient();

  const handleRetry = () => {
    if (queryKeyToInvalidate) {
      queryClient.invalidateQueries({ queryKey: queryKeyToInvalidate });
    } else {
      window.location.reload();
    }
  };

  return (
    <div className={className}>
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      {isLoading && (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 relative z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="font-mono text-muted-foreground text-sm tracking-widest uppercase">{loadingMessage}</span>
        </div>
      )}
      
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4 relative z-10">
          <div className="font-mono text-destructive max-w-md text-center border border-destructive/30 p-8 rounded-xl bg-destructive/5 glass-panel shadow-lg">
            <h3 className="font-bold mb-3 uppercase tracking-widest text-sm">Analysis Error</h3>
            <p className="text-xs opacity-80 mb-6 leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={handleRetry}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/30 rounded text-destructive font-mono transition-colors uppercase tracking-widest text-[10px] font-bold"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Retry Analysis
            </button>
          </div>
        </div>
      )}
      
      {!isLoading && !error && hasData && (
        <motion.div 
          className="relative z-10 h-full w-full flex flex-col"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}
