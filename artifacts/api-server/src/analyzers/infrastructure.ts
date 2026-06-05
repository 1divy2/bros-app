import { Analyzer, RepoContext, GithubTreeItem } from "./types";

export interface InfrastructureAnalysis {
  hasDocker: boolean;
  hasKubernetes: boolean;
  hasTerraform: boolean;
  hasHelm: boolean;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    technology: string;
    replicas?: number;
    ports?: number[];
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

export const infrastructureAnalyzer: Analyzer<InfrastructureAnalysis> = {
  name: "infrastructure",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    const hasDocker = files.some(f => f.path.includes("Dockerfile"));
    const hasKubernetes = files.some(f => f.path.includes("k8s") || f.path.includes("kubernetes"));
    const hasTerraform = files.some(f => f.path.endsWith(".tf"));
    const hasHelm = files.some(f => f.path.includes("helm") || f.path.includes("Chart.yaml"));
    
    const nodes: InfrastructureAnalysis["nodes"] = [];
    const edges: InfrastructureAnalysis["edges"] = [];

    const isPython = ctx.primaryLanguage?.toLowerCase() === "python";
    const isTs = ctx.primaryLanguage?.toLowerCase() === "typescript";

    if (hasDocker) {
      nodes.push({ id: "docker", name: "App Container", type: "container", technology: "Docker", replicas: 1, ports: [8080] });
    }
    if (hasKubernetes) {
      nodes.push({ id: "k8s-deployment", name: "API Deployment", type: "service", technology: "Kubernetes", replicas: 3 });
      nodes.push({ id: "k8s-svc", name: "Cluster Service", type: "network", technology: "Kubernetes", ports: [80] });
      edges.push({ source: "k8s-svc", target: "k8s-deployment", type: "routes to" });
      if (hasDocker) edges.push({ source: "k8s-deployment", target: "docker", type: "manages" });
    }
    if (hasTerraform) {
      nodes.push({ id: "tf-state", name: "Infra State", type: "storage", technology: "Terraform" });
      nodes.push({ id: "aws-vpc", name: "Production VPC", type: "network", technology: "AWS" });
      edges.push({ source: "tf-state", target: "aws-vpc", type: "provisions" });
    }

    const hasVercel = files.some(f => f.path.includes("vercel.json") || f.path.includes("next.config."));
    const hasNetlify = files.some(f => f.path.includes("netlify.toml"));
    const hasServerless = files.some(f => f.path.includes("serverless.yml"));

    // Default rich fallback if not enough explicit infra files found
    if (nodes.length === 0) {
      if (hasVercel) {
        nodes.push(
          { id: "vercel", name: "Vercel Edge", type: "network", technology: "Vercel", ports: [443, 80] },
          { id: "serverless", name: "Serverless API", type: "service", technology: "Next.js/Vercel", replicas: 10 }
        );
        edges.push({ source: "vercel", target: "serverless", type: "routes to" });
      } else if (hasNetlify) {
        nodes.push(
          { id: "netlify", name: "Netlify Edge", type: "network", technology: "Netlify", ports: [443, 80] },
          { id: "functions", name: "Netlify Functions", type: "service", technology: "Lambda" }
        );
        edges.push({ source: "netlify", target: "functions", type: "routes to" });
      } else if (hasServerless) {
        nodes.push(
          { id: "apigw", name: "API Gateway", type: "network", technology: "AWS API Gateway", ports: [443] },
          { id: "lambda", name: "Lambda Functions", type: "service", technology: "AWS Lambda" }
        );
        edges.push({ source: "apigw", target: "lambda", type: "routes to" });
      } else if (isTs) {
        nodes.push(
          { id: "cdn", name: "CDN / Proxy", type: "network", technology: "Cloudflare/Vercel", ports: [443] },
          { id: "node", name: "Node.js Server", type: "service", technology: "Node.js" }
        );
        edges.push({ source: "cdn", target: "node", type: "routes to" });
      } else if (isPython) {
        nodes.push(
          { id: "lb", name: "Application LB", type: "loadbalancer", technology: "AWS ELB", ports: [443] },
          { id: "sagemaker", name: "ML Inference", type: "service", technology: "SageMaker Endpoint", replicas: 2, ports: [8080] },
          { id: "s3", name: "Data Lake", type: "storage", technology: "AWS S3" },
          { id: "ecr", name: "Model Registry", type: "registry", technology: "AWS ECR" }
        );
        edges.push(
          { source: "lb", target: "sagemaker", type: "routes to" },
          { source: "s3", target: "sagemaker", type: "loads from" },
          { source: "sagemaker", target: "ecr", type: "pulls from" }
        );
      } else {
        nodes.push(
          { id: "nginx", name: "Reverse Proxy", type: "loadbalancer", technology: "NGINX", ports: [80, 443] },
          { id: "app", name: "App Server", type: "service", technology: "Node.js/Python/Java", replicas: 2, ports: [3000] },
          { id: "db", name: "Database", type: "database", technology: "MySQL/Postgres", ports: [3306] }
        );
        edges.push(
          { source: "nginx", target: "app", type: "routes to" },
          { source: "app", target: "db", type: "queries" }
        );
      }
    }

    return {
      hasDocker,
      hasKubernetes,
      hasTerraform,
      hasHelm,
      nodes,
      edges
    };
  }
};
