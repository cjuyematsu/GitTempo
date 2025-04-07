export interface CommitDataPoint {
    timestamp: string;
    author: string;
    additions: number;
    deletions: number;
    isDependencyChange: boolean;
  }