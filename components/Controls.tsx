import React from 'react';
import { useRouter } from 'next/router';

interface GraphControlsProps {
  authors: string[];
  selectedAuthors: string[];
  setSelectedAuthors: (authors: string[]) => void;
  showTrend: boolean;
  setShowTrend: (val: boolean) => void;
  mode: 'bar' | 'line';
  setMode: (mode: 'bar' | 'line') => void;
  includeInitial: boolean;
  setIncludeInitial: (val: boolean) => void;
  hoursBack: number;
  setHoursBack: (val: number) => void;
  hideDependencyCommits: boolean;
  setHideDependencyCommits: (val: boolean) => void;
  onAutoZoom: () => void;
}

export default function GraphControls({
  authors,
  selectedAuthors,
  setSelectedAuthors,
  showTrend,
  setShowTrend,
  mode,
  setMode,
  includeInitial,
  setIncludeInitial,
  hoursBack,
  setHoursBack,
  hideDependencyCommits,
  setHideDependencyCommits,
  onAutoZoom,
}: GraphControlsProps) {
  const router = useRouter();
  const toggleAuthor = (author: string) => {
    if (selectedAuthors.includes(author)) {
      setSelectedAuthors(selectedAuthors.filter((a) => a !== author));
    } else {
      setSelectedAuthors([...selectedAuthors, author]);
    }
  };

  return (
    <div className="mb-4 space-y-3">
      {/* Back button and title row */}
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={() => router.push('/')}
          className="flex items-center text-indigo-400 hover:text-indigo-300 text-sm"
        >
          ← Back to search
        </button>
      </div>

      {/* Compact controls row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Authors dropdown */}
        <div className="relative group">
          <button className="px-3 py-1 bg-gray-700 rounded text-sm flex items-center">
            Contributors ▼
          </button>
          <div className="absolute z-10 hidden group-hover:block bg-gray-800 p-3 rounded shadow-lg w-48 max-h-60 overflow-y-auto">
            <div className="space-y-2">
              {authors.map((author) => (
                <label key={author} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAuthors.includes(author)}
                    onChange={() => toggleAuthor(author)}
                    className="accent-indigo-500"
                  />
                  <span>{author}</span>
                </label>
              ))}
            </div>
            <div className="mt-2 space-x-2 text-xs">
              <button
                onClick={() => setSelectedAuthors([...authors])}
                className="text-indigo-400 hover:underline"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedAuthors([])}
                className="text-indigo-400 hover:underline"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showTrend}
              onChange={(e) => setShowTrend(e.target.checked)}
              className="accent-indigo-500"
            />
            Trend
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeInitial}
              onChange={(e) => setIncludeInitial(e.target.checked)}
              className="accent-indigo-500"
            />
            Initial Commit
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={hideDependencyCommits}
              onChange={(e) => setHideDependencyCommits(e.target.checked)}
              className="accent-indigo-500"
            />
            Hide Dependencies
          </label>
        </div>

        {/* Mode buttons */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Mode:</span>
          <button
            className={`px-2 py-1 rounded text-xs ${
              mode === 'bar' ? 'bg-indigo-600 text-white' : 'bg-gray-700'
            }`}
            onClick={() => setMode('bar')}
          >
            Bar
          </button>
          <button
            className={`px-2 py-1 rounded text-xs ${
              mode === 'line' ? 'bg-indigo-600 text-white' : 'bg-gray-700'
            }`}
            onClick={() => setMode('line')}
          >
            Line
          </button>
        </div>

        {/* Time range */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Range:</span>
          {[12, 24, 48, 168].map((h) => (
            <button
              key={h}
              onClick={() => setHoursBack(h)}
              className={`px-2 py-1 rounded text-xs ${
                hoursBack === h ? 'bg-indigo-600 text-white' : 'bg-gray-700'
              }`}
            >
              {h === 168 ? '7d' : `${h}h`}
            </button>
          ))}
        </div>

        {/* Auto-zoom */}
        <button
          onClick={onAutoZoom}
          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
        >
          Auto-Zoom
        </button>
      </div>
    </div>
  );
}