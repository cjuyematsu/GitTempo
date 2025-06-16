import { CommitDataPoint } from '../types';

interface GitHubFile {
  filename: string;
  additions?: number;
  deletions?: number;
  status?: string;
}

export async function fetchCommits(repo: string): Promise<CommitDataPoint[]> {
  const [owner, repoName] = repo.split('/');
  const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const perPage = 100;
  const maxCommits = 500;
  let allCommits: CommitDataPoint[] = [];
  let page = 1;

  while (allCommits.length < maxCommits) {
    const commitsUrl = `https://api.github.com/repos/${owner}/${repoName}/commits?per_page=${perPage}&page=${page}`;
    const res = await fetch(commitsUrl, { headers });
    if (!res.ok) throw new Error(`Failed to fetch commits list on page ${page}`);

    const commitList = await res.json();
    if (commitList.length === 0) break;

    for (const commit of commitList) {
      if (allCommits.length >= maxCommits) break;

      const sha = commit.sha;
      const detailUrl = `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}`;
      const detailRes = await fetch(detailUrl, { headers });
      if (!detailRes.ok) continue;

      const detail = await detailRes.json();
      const date = detail.commit.author.date;
      const author = detail.commit.author.name;

      let totalAdditions = 0;
      let totalDeletions = 0;
      let nonDependencyAdditions = 0;
      let nonDependencyDeletions = 0;
      let hasDependencyChanges = false;

      detail.files?.forEach((file: GitHubFile) => {
        const isDependencyFile =
          file.filename.includes('package.json') ||
          file.filename.includes('package-lock.json') ||
          file.filename.includes('yarn.lock');

        totalAdditions += file.additions || 0;
        totalDeletions += file.deletions || 0;

        if (isDependencyFile) {
          hasDependencyChanges = true;
        } else {
          nonDependencyAdditions += file.additions || 0;
          nonDependencyDeletions += file.deletions || 0;
        }
      });

      allCommits.push({
        timestamp: date,
        author,
        additions: totalAdditions,
        deletions: totalDeletions,
        nonDependencyAdditions,
        nonDependencyDeletions,
        isDependencyChange: hasDependencyChanges,
      });
    }

    page++;
  }

  return allCommits;
}
