import { Analyzer, RepoContext, GithubTreeItem } from "./types";

export interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: "hardcoded-secret" | "weak-auth" | "missing-validation" | "exposed-credential" | "unsafe-endpoint" | "dependency-vulnerability" | "other";
  title: string;
  description: string;
  location: string;
  mitigation?: string;
}

export interface SecurityAnalysis {
  findings: SecurityFinding[];
  riskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export const securityAnalyzer: Analyzer<SecurityAnalysis> = {
  name: "security",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    const findings: SecurityFinding[] = [];
    
    // Heuristic security checks
    const hasEnvExample = files.some(f => f.path.includes(".env.example") || f.path.includes(".env.template"));
    const hasEnvReal = files.some(f => f.path.endsWith(".env"));
    
    if (hasEnvReal) {
      findings.push({
        id: "sec-env",
        severity: "critical",
        category: "exposed-credential",
        title: "Committed .env file",
        description: "A .env file was committed to the repository, potentially exposing secrets.",
        location: files.find(f => f.path.endsWith(".env"))?.path || ".env",
        mitigation: "Remove the .env file from version control and add it to .gitignore. Rotate any exposed secrets immediately."
      });
    }

    if (!hasEnvExample) {
      findings.push({
        id: "sec-env-example",
        severity: "info",
        category: "other",
        title: "Missing .env.example",
        description: "No .env.example file found. This makes it difficult for developers to know what environment variables are required securely.",
        location: "Root",
        mitigation: "Create a .env.example file containing only dummy values."
      });
    }

    const packageJsons = files.filter(f => f.path.endsWith("package.json") && !f.path.includes("node_modules"));
    if (packageJsons.length > 0) {
      findings.push({
        id: "sec-deps",
        severity: "low",
        category: "dependency-vulnerability",
        title: "Unpinned Dependencies",
        description: "Found package.json files. Ensure dependencies are pinned or regularly updated via dependabot to avoid supply chain attacks.",
        location: packageJsons[0].path,
        mitigation: "Use package-lock.json or yarn.lock and consider automated dependency updates."
      });
    }

    const pemFiles = files.filter(f => f.path.endsWith(".pem") || f.path.endsWith(".key") || f.path.endsWith("_rsa"));
    for (const file of pemFiles) {
      findings.push({
        id: `sec-key-${file.path}`,
        severity: "critical",
        category: "exposed-credential",
        title: "Exposed Private Key",
        description: "A private key or certificate file was found in the repository.",
        location: file.path,
        mitigation: "Remove the key file from version control, revoke it immediately, and generate a new one."
      });
    }

    const authFiles = files.filter(f => f.path.includes("auth") || f.path.includes("passport") || f.path.includes("jwt"));
    if (authFiles.length === 0) {
      findings.push({
        id: "sec-auth",
        severity: "medium",
        category: "weak-auth",
        title: "No Authentication Module Detected",
        description: "Could not find standard authentication files or folders. Ensure endpoints are properly secured.",
        location: "Repository",
        mitigation: "Implement robust authentication (e.g., JWT, OAuth) for sensitive operations."
      });
    }

    const criticalCount = findings.filter(f => f.severity === "critical").length;
    const highCount = findings.filter(f => f.severity === "high").length;
    const mediumCount = findings.filter(f => f.severity === "medium").length;
    const lowCount = findings.filter(f => f.severity === "low").length;

    // Calculate a rough risk score out of 100
    const riskScore = Math.min(100, (criticalCount * 30) + (highCount * 15) + (mediumCount * 5) + (lowCount * 2));

    return {
      findings,
      riskScore,
      criticalCount,
      highCount,
      mediumCount,
      lowCount
    };
  }
};
