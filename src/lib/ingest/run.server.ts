/**
 * High-level ingest orchestration. Three flows:
 *   - runIngestPush(): re-ingest every post + media markdown file
 *   - runIngestIssue(num, action): sync a single issue (or delete on `deleted`)
 *   - runFullResync(): everything, plus orphan reaping
 */
import {
  deleteByKindSource,
  ingestMedia,
  ingestPost,
  ingestTweet,
  reapOrphans,
  type IngestReport,
} from "./store.server";
import { fetchFileText, getIssue, listDir, listIssues } from "./github.server";
import { parseIssueAsTweet, parseMedia, parsePost } from "./parse.server";

async function ingestAllPosts(): Promise<{ reports: IngestReport[]; ids: Set<string> }> {
  const files = await listDir("posts");
  const reports: IngestReport[] = [];
  const ids = new Set<string>();
  for (const f of files) {
    ids.add(f.path);
    const raw = await fetchFileText(f.path);
    if (!raw) continue;
    const parsed = parsePost(f.path, raw, f.htmlUrl);
    try {
      reports.push(await ingestPost(parsed));
    } catch (err) {
      reports.push({ kind: "post", sourceId: f.path, action: "skipped", reason: String(err) });
    }
  }
  return { reports, ids };
}

async function ingestAllMedia(): Promise<{ reports: IngestReport[]; ids: Set<string> }> {
  const files = await listDir("media");
  const reports: IngestReport[] = [];
  const ids = new Set<string>();
  for (const f of files) {
    ids.add(f.path);
    const raw = await fetchFileText(f.path);
    if (!raw) continue;
    const parsed = parseMedia(f.path, raw, f.htmlUrl);
    try {
      reports.push(await ingestMedia(parsed));
    } catch (err) {
      reports.push({ kind: "media", sourceId: f.path, action: "skipped", reason: String(err) });
    }
  }
  return { reports, ids };
}

async function ingestAllIssues(): Promise<{ reports: IngestReport[]; ids: Set<string> }> {
  const issues = await listIssues();
  const reports: IngestReport[] = [];
  const ids = new Set<string>();
  for (const it of issues) {
    ids.add(String(it.number));
    if (it.state === "closed") {
      reports.push(await deleteByKindSource("tweet", String(it.number)));
      continue;
    }
    const parsed = parseIssueAsTweet(it);
    try {
      reports.push(await ingestTweet(parsed));
    } catch (err) {
      reports.push({ kind: "tweet", sourceId: String(it.number), action: "skipped", reason: String(err) });
    }
  }
  return { reports, ids };
}

export async function runIngestPush(): Promise<IngestReport[]> {
  const [posts, media] = await Promise.all([ingestAllPosts(), ingestAllMedia()]);
  return [...posts.reports, ...media.reports];
}

export async function runIngestIssue(num: number, action: string): Promise<IngestReport[]> {
  if (action === "deleted") {
    return [await deleteByKindSource("tweet", String(num))];
  }
  const it = await getIssue(num);
  if (!it) return [{ kind: "tweet", sourceId: String(num), action: "skipped", reason: "not found" }];
  if (it.state === "closed") {
    return [await deleteByKindSource("tweet", String(num))];
  }
  return [await ingestTweet(parseIssueAsTweet(it))];
}

export async function runFullResync(): Promise<IngestReport[]> {
  const [posts, media, issues] = await Promise.all([
    ingestAllPosts(),
    ingestAllMedia(),
    ingestAllIssues(),
  ]);
  const orphanReports: IngestReport[] = [];
  const [orphanPosts, orphanMedia, orphanTweets] = await Promise.all([
    reapOrphans("post", posts.ids),
    reapOrphans("media", media.ids),
    reapOrphans("tweet", issues.ids),
  ]);
  if (orphanPosts) orphanReports.push({ kind: "post", sourceId: "(orphans)", action: "deleted", reason: `${orphanPosts} rows` });
  if (orphanMedia) orphanReports.push({ kind: "media", sourceId: "(orphans)", action: "deleted", reason: `${orphanMedia} rows` });
  if (orphanTweets) orphanReports.push({ kind: "tweet", sourceId: "(orphans)", action: "deleted", reason: `${orphanTweets} rows` });
  return [...posts.reports, ...media.reports, ...issues.reports, ...orphanReports];
}