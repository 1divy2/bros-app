import { Analyzer, RepoContext, GithubTreeItem } from "./types";

export interface GeneratedDocs {
  sections: Array<{
    id: string;
    type: "overview" | "architecture" | "api" | "database" | "deployment" | "onboarding";
    title: string;
    content: string;
  }>;
  generatedAt: string;
}

export const docsAnalyzer: Analyzer<GeneratedDocs> = {
  name: "docs",
  analyze: async (ctx: RepoContext, files: GithubTreeItem[]) => {
    const sections: GeneratedDocs["sections"] = [];

    // Analyze basic facts
    const hasDocker = files.some(f => f.path.includes("Dockerfile") || f.path.includes("docker-compose"));
    const hasGithubActions = files.some(f => f.path.includes(".github/workflows"));
    const hasApi = files.some(f => f.path.includes("api/") || f.path.includes("routes/"));
    
    let dbType = "None";
    if (files.some(f => f.path.includes("prisma"))) dbType = "Prisma ORM";
    else if (files.some(f => f.path.includes("drizzle"))) dbType = "Drizzle ORM";
    else if (files.some(f => f.path.includes("typeorm"))) dbType = "TypeORM";

    // Try to fetch actual README
    const readmeFile = files.find(f => f.path.toLowerCase() === "readme.md" || f.path.toLowerCase() === "readme");
    let readmeContent = "";
    if (readmeFile) {
      const { fetchFileContent } = await import("./tree");
      readmeContent = await fetchFileContent(ctx.owner, ctx.name, readmeFile.path) || "";
    }

    // Build Overview
    if (readmeContent && readmeContent.length > 50) {
      // Use actual README for overview
      sections.push({
        id: "doc-overview",
        type: "overview",
        title: "Project README",
        content: readmeContent
      });
    } else {
      sections.push({
        id: "doc-overview",
        type: "overview",
        title: "Project Overview",
        content: `# ${ctx.name}\n\nRepository: \`${ctx.owner}/${ctx.name}\`\n\n## Summary\nThis repository was analyzed to generate structural and architectural insights. It contains **${files.length}** tracked files.\n\n## Key Technologies Detected\n- **Database**: ${dbType}\n- **Containerization**: ${hasDocker ? "Yes (Docker)" : "No"}\n- **CI/CD**: ${hasGithubActions ? "GitHub Actions" : "Unknown/Other"}\n`
      });
    }

    // Build Architecture
    sections.push({
      id: "doc-arch",
      type: "architecture",
      title: "Architecture & Structure",
      content: `# Architecture Guidelines\n\nBased on the repository structure, this project follows a modular design. \n\n## Key Directories\n${files.filter(f => f.type === "tree" && f.path.split('/').length === 1).slice(0, 5).map(d => `- **${d.path}/**: Core module`).join('\n')}\n\n## Separation of Concerns\nEnsure that business logic remains separated from the routing layer. Use dependency injection where possible to make testing easier.`
    });

    // Build API
    if (hasApi) {
      sections.push({
        id: "doc-api",
        type: "api",
        title: "API Conventions",
        content: `# API Guidelines\n\nThis project exposes HTTP endpoints.\n\n## Routing\nRoutes are discovered in the API layer. Ensure all new endpoints follow RESTful naming conventions.\n\n| Method | Purpose |\n|--------|---------|\n| GET | Retrieve resources |\n| POST | Create new resources |\n| PUT | Replace existing resources |\n| PATCH | Partially update resources |\n| DELETE | Remove resources |`
      });
    }

    // Build Deployment
    sections.push({
      id: "doc-deploy",
      type: "deployment",
      title: "Deployment Guide",
      content: `# Deployment\n\n${hasDocker ? 'This application is containerized. To deploy, build the Docker image and push it to your registry.\n\n```bash\ndocker build -t app:latest .\ndocker run -p 8080:8080 app:latest\n```' : 'Standard Node.js or static deployment required.\n\n```bash\nnpm install\nnpm run build\nnpm start\n```'}`
    });

    // Build Onboarding
    sections.push({
      id: "doc-onboarding",
      type: "onboarding",
      title: "Developer Onboarding",
      content: `# Getting Started\n\nWelcome to the team!\n\n## Prerequisites\n1. Node.js (Latest LTS)\n2. Git\n3. ${hasDocker ? 'Docker Desktop' : 'A local database instance'}\n\n## Setup Steps\n- Clone the repository\n- Copy \`.env.example\` to \`.env\` and fill in the values\n- Run install command\n- Start the development server`
    });

    return {
      sections,
      generatedAt: new Date().toISOString()
    };
  }
};
