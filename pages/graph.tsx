// gittempo/pages/graph.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { fetchCommits } from '../utils/fetchCommits';
import dynamic from 'next/dynamic';
import { CommitDataPoint } from '../types';

const GitGraph = dynamic(() => import('../components/GitGraph'), { 
  ssr: false,
  loading: () => <div className="h-1 w-full bg-gray-800 overflow-hidden">
    <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '80%' }} />
  </div>
});

function extractRepoPath(input: string): string | null {
  const match = input.match(/github\.com\/([^/]+\/[^/]+)/);
  return match ? match[1] : input.includes('/') ? input : null;
}

export default function GraphPage() {
  const router = useRouter();
  const { repo } = router.query;

  const [commits, setCommits] = useState<CommitDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!repo || typeof repo !== 'string') return;
  
    const repoPath = extractRepoPath(repo);
    if (!repoPath) {
      setError('Invalid GitHub URL or repository format.');
      setLoading(false);
      return;
    }
  
    import('../components/GitGraph');
  
    const loadCommits = async () => {
      try {
        setLoading(true);
        setProgress(0);
    
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev < 50) {
              return Math.min(prev + 2, 50);
            } else if (prev < 90) {
              return Math.min(prev + 1, 90);
            } else {
              return prev;
            }
          });
        }, 400); // slower interval for gradual feel
    
        const data = await fetchCommits(repoPath);
    
        clearInterval(progressInterval);
        setProgress(100);
    
        await new Promise(resolve => setTimeout(resolve, 250)); // small delay for smooth finish
    
        setCommits(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch commits. Please check the repo URL.');
        setLoading(false);
        setProgress(0);
      }
    };
    
    loadCommits();
  }, [repo]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {repo && typeof repo === 'string' ? (
        <h1 className="text-3xl font-bold mb-4">
          Commit Activity for{' '}
          <span className="text-indigo-400 font-semibold">
            {repo.split('/').pop()}
          </span>
        </h1>
      ) : null}
      
      {/* Loading state with progress bar */}
      {loading && (
        <div className="space-y-4">
          <div className="w-full bg-gray-800 rounded-full h-2.5">
            <div 
              className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading commit data... ({progress}%)
          </p>
          <p className="text-gray-400 flex items-center">
            This may take a few minutes 
          </p>
        </div>
      )}

      {error && <p className="text-red-500">{error}</p>}

      {!loading && commits.length > 0 && (
        <GitGraph repo={repo as string} commits={commits} />
      )}

      {!loading && commits.length === 0 && !error && (
        <p className="text-gray-400">No commits found</p>
      )}
    </div>
  );
}