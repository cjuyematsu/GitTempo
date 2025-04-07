export interface CommitDataPoint {
    timestamp: string;
    author: string;
    additions: number;
    deletions: number;
    nonDependencyAdditions: number;
    nonDependencyDeletions: number;
    isDependencyChange: boolean;
  }