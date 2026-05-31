/**
 * GitHub content fetcher — server-only.
 * Lists posts/, media/, and Issues from the configured content repo.
 */
import { Octokit } from "@octokit/rest";

export interface GhFile {
  path: string;
  sha: string;
  size: number;
  htmlUrl: string;
  downloadUrl: string | null;
}

export interface GhIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: string[];
  htmlUrl: string;
  user: string | null;
  createdAt: string;
  updatedAt: string;
}

function getRepo(): { owner: string; repo: string } {
  const slug = process.env.GITHUB_CONTENT_REPO;
  if (!slug || !slug.includes("/")) {
    throw new Error("GITHUB_CONTENT_REPO not set (expected 'owner/repo')");
  }
  const [owner, repo] = slug.split("/", 2);
  return { owner, repo };
}

function octo() {
  const auth = process.env.GITHUB_TOKEN_INGEST;
  if (!auth) throw new Error("GITHUB_TOKEN_INGEST is not configured");
  return new Octokit({ auth });
}

/** List every markdown file under a directory (top-level only, no recursion). */
export async function listDir(dir: "posts" | "media"): Promise<GhFile[]> {
  const { owner, repo } = getRepo();
  const client = octo();
  try {
    const res = await client.repos.getContent({ owner, repo, path: dir });
    const items = Array.isArray(res.data) ? res.data : [res.data];
    return items
      .filter((it) => it.type === "file" && it.name.endsWith(".md"))
      .map((it) => ({
        path: it.path,
        sha: it.sha,
        size: it.size,
        htmlUrl: it.html_url ?? "",
        downloadUrl: (it as { download_url: string | null }).download_url ?? null,
      }));
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return []; // dir doesn't exist yet
    throw err;
  }
}

export async function fetchFileText(path: string): Promise<string | null> {
  const { owner, repo } = getRepo();
  const client = octo();
  try {
    const res = await client.repos.getContent({ owner, repo, path });
    if (Array.isArray(res.data) || res.data.type !== "file") return null;
    const file = res.data as { content?: string; encoding?: string };
    if (!file.content) return null;
    if (file.encoding === "base64") {
      return Buffer.from(file.content, "base64").toString("utf8");
    }
    return file.content;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return null;
    throw err;
  }
}

export async function listIssues(): Promise<GhIssue[]> {
  const { owner, repo } = getRepo();
  const client = octo();
  const out: GhIssue[] = [];
  // Paginate; cap at 200 for safety.
  for (let page = 1; page <= 4; page++) {
    const res = await client.issues.listForRepo({
      owner,
      repo,
      state: "all",
      per_page: 50,
      page,
    });
    if (!res.data.length) break;
    for (const it of res.data) {
      if (it.pull_request) continue; // skip PRs
      out.push({
        number: it.number,
        title: it.title,
        body: it.body ?? null,
        state: it.state as "open" | "closed",
        labels: it.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean),
        htmlUrl: it.html_url,
        user: it.user?.login ?? null,
        createdAt: it.created_at,
        updatedAt: it.updated_at,
      });
    }
    if (res.data.length < 50) break;
  }
  return out;
}

export async function getIssue(num: number): Promise<GhIssue | null> {
  const { owner, repo } = getRepo();
  const client = octo();
  try {
    const res = await client.issues.get({ owner, repo, issue_number: num });
    const it = res.data;
    if (it.pull_request) return null;
    return {
      number: it.number,
      title: it.title,
      body: it.body ?? null,
      state: it.state as "open" | "closed",
      labels: it.labels.map((l) => (typeof l === "string" ? l : l.name ?? "")).filter(Boolean),
      htmlUrl: it.html_url,
      user: it.user?.login ?? null,
      createdAt: it.created_at,
      updatedAt: it.updated_at,
    };
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}