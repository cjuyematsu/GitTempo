import { differenceInHours, parseISO, subHours } from 'date-fns';
import { CommitDataPoint } from '../types';

interface GitHubFile {
  filename: string;
  additions?: number;
  deletions?: number;
  status?: string;
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
    
    // Track both total and non-dependency changes
    let totalAdditions = 0;
    let totalDeletions = 0;
    let nonDependencyAdditions = 0;
    let nonDependencyDeletions = 0;
    let hasDependencyChanges = false;
    
    // Process each file in the commit
    detail.files?.forEach((file: GitHubFile) => {
      const isDependencyFile = 
        file.filename.includes('package.json') || 
        file.filename.includes('package-lock.json') ||
        file.filename.includes('yarn.lock');
      
      // Count all changes for totals
      totalAdditions += file.additions || 0;
      totalDeletions += file.deletions || 0;
      
      if (isDependencyFile) {
        hasDependencyChanges = true;
      } else {
        // Count only non-dependency changes
        nonDependencyAdditions += file.additions || 0;
        nonDependencyDeletions += file.deletions || 0;
      }
    });

    if (differenceInHours(new Date(), parseISO(date)) <= 48) {
      data.push({
        timestamp: date,
        author,
        additions: totalAdditions, // Will be filtered in GitGraph component
        deletions: totalDeletions, // Will be filtered in GitGraph component
        nonDependencyAdditions,    // For filtered view
        nonDependencyDeletions,    // For filtered view
        isDependencyChange: hasDependencyChanges
      });
    }
  }

  return data;
}