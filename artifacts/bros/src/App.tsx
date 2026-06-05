import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";

import Home from "@/pages/home";
import SystemMap from "@/pages/repo/system";
import Architecture from "@/pages/repo/architecture";
import Dependencies from "@/pages/repo/dependencies";
import APIs from "@/pages/repo/apis";
import Databases from "@/pages/repo/databases";
import Security from "@/pages/repo/security";
import Quality from "@/pages/repo/quality";
import Infrastructure from "@/pages/repo/infrastructure";
import Cicd from "@/pages/repo/cicd";
import Flows from "@/pages/repo/flows";
import Knowledge from "@/pages/repo/knowledge";
import Docs from "@/pages/repo/docs";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/repo/:id" component={SystemMap} />
      <Route path="/repo/:id/architecture" component={Architecture} />
      <Route path="/repo/:id/dependencies" component={Dependencies} />
      <Route path="/repo/:id/apis" component={APIs} />
      <Route path="/repo/:id/databases" component={Databases} />
      <Route path="/repo/:id/security" component={Security} />
      <Route path="/repo/:id/quality" component={Quality} />
      <Route path="/repo/:id/infrastructure" component={Infrastructure} />
      <Route path="/repo/:id/cicd" component={Cicd} />
      <Route path="/repo/:id/flows" component={Flows} />
      <Route path="/repo/:id/knowledge" component={Knowledge} />
      <Route path="/repo/:id/docs" component={Docs} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
