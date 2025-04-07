// gittempo/pages/graph.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchCommits } from '../utils/fetchCommits';
import GitGraph from '../components/GitGraph';

interface CommitDataPoint {
  timestamp: string;
  author: string;
  additions: number;
  deletions: number;
}

export default function GraphPage() {
  const router = useRouter();
  const { repo } = router.query;

  const [commits, setCommits] = useState<CommitDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!repo || typeof repo !== 'string') return;

    const loadCommits = async () => {
      try {
        const data = await fetchCommits(repo);
        setCommits(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch commits. Please check the repo URL.');
        setLoading(false);
      }
    };

    loadCommits();
  }, [repo]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {typeof repo === 'string' && (
        <h1 className="text-3xl font-bold mb-4">
          Commit Activity for{' '}
          <span className="text-indigo-400 font-semibold">
            {repo.split('/').pop()}
          </span>
        </h1>
      )}
      {loading && <p className="text-gray-400">Loading commits...</p>}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && commits.length > 0 && (
        <GitGraph repo={repo as string} commits={commits} />
      )}

      {!loading && commits.length === 0 && !error && (
        <p className="text-gray-400">No commits found in the last 48 hours.</p>
      )}
    </div>
  );
}