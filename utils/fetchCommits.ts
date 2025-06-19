// gittempo/utils/fetchCommits.ts
import { CommitDataPoint } from '../types';

export async function fetchCommits(repo: string): Promise<CommitDataPoint[]> {
  const response = await fetch(`/api/fetchCommits?repo=${repo}`);
  if (!response.ok) {
    throw new Error('Failed to fetch commits from the server.');
  }
  return response.json();
}