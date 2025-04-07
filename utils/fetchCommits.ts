import { differenceInHours, parseISO, subHours } from 'date-fns';
import { CommitDataPoint } from '../types';


interface GitHubFile {
  filename: string;
  additions?:number;
  deletions?: string;
}

export async function fetchCommits(repo: string): Promise<CommitDataPoint[]> {
  const [owner, repoName] = repo.split('/');
  const since = subHours(new Date(), 72).toISOString();
  const token = process.env.NEXT_PUBLIC_GITHUB_TOKEN;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const commitsUrl = `https://api.github.com/repos/${owner}/${repoName}/commits?since=${since}&per_page=100`;

  const res = await fetch(commitsUrl, { headers }); 
  if (!res.ok) throw new Error('Failed to fetch commits list');

  const commitList = await res.json();
  const data: CommitDataPoint[] = [];

  for (const commit of commitList) {
    const sha = commit.sha;
    const detailUrl = `https://api.github.com/repos/${owner}/${repoName}/commits/${sha}`;
    const detailRes = await fetch(detailUrl, { headers }); 
    if (!detailRes.ok) continue;

    const detail = await detailRes.json();
    const date = detail.commit.author.date;
    const author = detail.commit.author.name;
    const additions = detail.stats?.additions || 0;
    const deletions = detail.stats?.deletions || 0;
    
    // Check if commit is dependency-related
    const isDependencyChange = detail.files?.some((file: GitHubFile) => 
      file.filename.includes('package.json') || 
      file.filename.includes('package-lock.json') ||
      file.filename.includes('yarn.lock')
    ) || false;

    if (differenceInHours(new Date(), parseISO(date)) <= 48) {
      data.push({
        timestamp: date,
        author,
        additions,
        deletions,
        isDependencyChange
      });
    }
  }

  return data;
}