import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground tech-grid">
      <div className="border border-border bg-card/30 p-8 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <h1 className="font-mono font-bold text-lg text-foreground">404 — Not Found</h1>
        </div>
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          The requested path does not match any known route.
        </p>
        <Link
          href="/"
          className="inline-block mt-6 font-mono text-xs text-primary border border-primary/40 px-4 py-2 hover:bg-primary/10 transition-colors"
        >
          Return to terminal
        </Link>
      </div>
    </div>
  );
}
