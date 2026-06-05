import axios from "axios";

// Standard GitHub API client to fetch repository metadata
export async function fetchGithubMetadata(owner: string, name: string) {
  try {
    // Attempt to fetch without auth first (rate limits apply)
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
      "User-Agent": "brOS-Analyzer",
    };
    
    // Add token if available
    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const { data } = await axios.get(`https://api.github.com/repos/${owner}/${name}`, {
      headers,
    });

    return {
      description: data.description || null,
      primaryLanguage: data.language || null,
      stars: data.stargazers_count || 0,
      defaultBranch: data.default_branch || "main",
      topics: data.topics || [],
      forks: data.forks_count || 0,
      license: data.license?.name || null,
      repoSize: data.size || 0, // size is in KB
    };
  } catch (error: any) {
    console.error(`Failed to fetch GitHub metadata for ${owner}/${name}:`, error.message);
    throw new Error(`GitHub API error: ${error.response?.data?.message || error.message}`);
  }
}
