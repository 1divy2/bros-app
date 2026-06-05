import axios from "axios";
import { GithubTreeItem } from "./types";

export async function fetchRepositoryTree(owner: string, name: string, branch: string = "main"): Promise<GithubTreeItem[]> {
  try {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "brOS-Analyzer",
    };
    
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    // First get the latest commit for the branch
    const { data: refData } = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/ref/heads/${branch}`, {
      headers,
    });
    
    const commitSha = refData.object.sha;

    // Get the tree recursively
    const { data: treeData } = await axios.get(`https://api.github.com/repos/${owner}/${name}/git/trees/${commitSha}?recursive=1`, {
      headers,
    });

    return treeData.tree as GithubTreeItem[];
  } catch (error: any) {
    console.error(`Failed to fetch tree for ${owner}/${name}:`, error.message);
    // If branch not found, try 'master' as fallback if 'main' was used
    if (branch === "main" && error.response?.status === 404) {
      return fetchRepositoryTree(owner, name, "master");
    }
    throw new Error(`Failed to fetch repository tree: ${error.message}`);
  }
}

export async function fetchFileContent(owner: string, name: string, path: string): Promise<string> {
  try {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3.raw",
      "User-Agent": "brOS-Analyzer",
    };
    
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const { data } = await axios.get(`https://api.github.com/repos/${owner}/${name}/contents/${path}`, {
      headers,
    });

    return typeof data === "string" ? data : JSON.stringify(data);
  } catch (error: any) {
    console.error(`Failed to fetch file content for ${path}:`, error.message);
    return "";
  }
}
