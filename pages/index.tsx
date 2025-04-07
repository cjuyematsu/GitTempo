// gittempo/pages/index.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const extractRepoPath = (url: string): string | null => {
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(\/)?$/);
    return match ? `${match[1]}/${match[2]}` : null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const repoPath = extractRepoPath(repoUrl.trim());
    if (repoPath) {
      router.push(`/graph?repo=${repoPath}`);
    } else {
      setError('Please enter a valid GitHub repository URL.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4">
      <h1 className="text-4xl font-bold mb-6">GitTempo</h1>
      <p className="mb-4 text-gray-400">Paste a public GitHub repo URL to visualize commit activity within the last 72 hours</p>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <input
          type="text"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
          className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          type="submit"
          className="mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-semibold transition"
        >
          Generate Graph
        </button>
        <p className="mb-4 text-gray-400 pt-6 text-center">Were you rushing or were you dragging</p>
      </form>
    </div>
  );
}