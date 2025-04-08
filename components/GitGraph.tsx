import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { format, subHours, startOfHour, addHours, differenceInHours } from 'date-fns';
import GraphControls from './Controls';
import type { Chart as ChartJSInstance } from 'chart.js';
import { CommitDataPoint } from '../types';

import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Chart), {
  ssr: false,
});

interface Props {
  repo: string;
  commits: CommitDataPoint[];
}

export default function GitGraph({ commits }: Props) {
  const allAuthors = [...new Set(commits.map((c) => c.author))];

  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(allAuthors);
  const [showTrend, setShowTrend] = useState(true);
  const [mode, setMode] = useState<'bar' | 'line'>('bar');
  const [timeRange, setTimeRange] = useState<{
    type: 'hours' | 'custom';
    hoursBack?: number;
    startDate?: Date;
    endDate?: Date;
  }>({ type: 'hours', hoursBack: 48 });
  const [hideDependencyCommits, setHideDependencyCommits] = useState(true);
  const chartRef = useRef<ChartJSInstance<'bar' | 'line'> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [minIndex, setMinIndex] = useState<number | undefined>(undefined);
  const [maxIndex, setMaxIndex] = useState<number | undefined>(undefined);
  const [lastZoomData, setLastZoomData] = useState<{
    dataId: string; // composite key of current data state
    zoomRange: [number, number] | null;
  }>({ dataId: '', zoomRange: null });
  
  // Delay render until client-side
  const [isChartReady, setIsChartReady] = useState(false);

  // Calculate the actual start and end dates based on the time range settings
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    if (timeRange.type === 'custom' && timeRange.startDate && timeRange.endDate) {
      return {
        startDate: timeRange.startDate,
        endDate: timeRange.endDate
      };
    } else if (timeRange.type === 'hours' && timeRange.hoursBack) {
      return {
        startDate: subHours(now, timeRange.hoursBack),
        endDate: now
      };
    }
    // Default to 48 hours if no valid range is set
    return {
      startDate: subHours(now, 48),
      endDate: now
    };
  }, [timeRange]);

  // Define filteredCommits before it's used in the useEffect
  const filteredCommits = useMemo(() => {
    // First filter by date range
    let filtered = commits.filter((c) => {
      const commitDate = new Date(c.timestamp);
      return commitDate >= startDate && commitDate <= endDate;
    });
    
    // Then filter by selected authors
    filtered = filtered.filter((c) => selectedAuthors.includes(c.author));    
    return filtered;

  }, [commits, selectedAuthors, startDate, endDate]);

  useEffect(() => {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      BarElement,
      PointElement,
      LineElement,
      Tooltip,
      Legend,
      zoomPlugin
    );
    setIsChartReady(true);
  }, []);

  useEffect(() => {
    if (commits.length > 0) {
      handleZoomOutToAllCommits();
    }
  }, []);

  // Reset zoom when time frame or filters change
  useEffect(() => {
    // Reset zoom to show the full range of data when time frame changes
    setMinIndex(undefined);
    setMaxIndex(undefined);
    // Also reset lastZoomData when time frame changes
    setLastZoomData({ dataId: '', zoomRange: null });
  }, [timeRange]);

  const { labels, additionsData, deletionsData, trendData } = useMemo(() => {
    // Calculate the total hours in the selected range
    const totalHours = differenceInHours(endDate, startDate);
    
    // Determine bin size based on total time range
    let binSizeHours = 1; // Default to 1 hour bins
    
    if (totalHours > 168) { // More than 7 days
      binSizeHours = 6; // Use 6-hour bins
    } else if (totalHours > 72) { // More than 3 days
      binSizeHours = 3; // Use 3-hour bins
    } else if (totalHours > 48) { // More than 2 days
      binSizeHours = 2; // Use 2-hour bins
    }
    
    // Calculate number of bins
    const numBins = Math.ceil(totalHours / binSizeHours);
    
    // Create bins
    const bins: Record<string, { adds: number; dels: number }> = {};
    
    for (let i = 0; i < numBins; i++) {
      const binStart = addHours(startDate, i * binSizeHours);
      const binEnd = addHours(binStart, binSizeHours);
      
      let label;
      if (binSizeHours === 1) {
        label = format(startOfHour(binStart), 'MMM d, ha');
      } else {
        label = `${format(binStart, 'MMM d, ha')} - ${format(binEnd, 'ha')}`;
      }
      
      bins[label] = { adds: 0, dels: 0 };
    }

    filteredCommits.forEach(({ timestamp, additions, deletions, nonDependencyAdditions, nonDependencyDeletions, isDependencyChange }) => {
      const commitDate = new Date(timestamp);
      const hoursSinceStart = differenceInHours(commitDate, startDate);
      const binIndex = Math.floor(hoursSinceStart / binSizeHours);
      
      const binStart = addHours(startDate, binIndex * binSizeHours);
      const binEnd = addHours(binStart, binSizeHours);
      
      let label;
      if (binSizeHours === 1) {
        label = format(startOfHour(binStart), 'MMM d, ha');
      } else {
        label = `${format(binStart, 'MMM d, ha')} - ${format(binEnd, 'ha')}`;
      }
      
      if (!bins[label]) return;

      if (hideDependencyCommits && isDependencyChange) {
        // Only count non-dependency changes for dependency commits when toggle is on
        bins[label].adds += nonDependencyAdditions;
        bins[label].dels += nonDependencyDeletions;
      } else {
        // Count all changes otherwise
        bins[label].adds += additions;
        bins[label].dels += deletions;
      }
    });

    const labels = Object.keys(bins);
    const additionsData = labels.map((h) => bins[h].adds);
    const deletionsData = labels.map((h) => -bins[h].dels);
    const trendData = additionsData.map((_, i, arr) => {
      const prev = arr[i - 1] ?? 0;
      const curr = arr[i];
      const next = arr[i + 1] ?? 0;
      return Math.round((prev + curr + next) / 3);
    });

    return { labels, additionsData, deletionsData, trendData };
  }, [filteredCommits, startDate, endDate, hideDependencyCommits]);

  // Calculate totals based on current filter state
  const { totalAdditions, totalDeletions, visibleCommits } = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let visibleCount = 0;

    filteredCommits.forEach(({ additions: allAdds, deletions: allDels, nonDependencyAdditions, nonDependencyDeletions, isDependencyChange }) => {
      if (hideDependencyCommits && isDependencyChange) {
        additions += nonDependencyAdditions;
        deletions += nonDependencyDeletions;
        if (nonDependencyAdditions > 0 || nonDependencyDeletions > 0) {
          visibleCount++;
        }
      } else {
        additions += allAdds;
        deletions += allDels;
        visibleCount++;
      }
    });

    return {
      totalAdditions: additions,
      totalDeletions: deletions,
      visibleCommits: visibleCount
    };
  }, [filteredCommits, hideDependencyCommits]);

  const chartData = {
    labels,
    datasets: [
      ...(mode === 'bar'
        ? [
            {
              label: 'Additions',
              data: additionsData,
              backgroundColor: 'rgba(34,197,94,0.8)',
              stack: 'stack1',
            },
            {
              label: 'Deletions',
              data: deletionsData,
              backgroundColor: 'rgba(239,68,68,0.8)',
              stack: 'stack1',
            },
          ]
        : [
            {
              label: 'Net Changes',
              data: additionsData.map((val, i) => val + deletionsData[i]),
              borderColor: 'rgba(34,197,94,0.8)',
              backgroundColor: 'rgba(34,197,94,0.3)',
              fill: true,
              tension: 0.3,
            },
          ]),
      ...(showTrend
        ? [
            {
              label: 'Trend',
              data: trendData,
              borderColor: 'rgba(59,130,246,0.9)',
              borderDash: [4, 4],
              pointRadius: 0,
              type: 'line' as const,
            },
          ]
        : []),
    ],
  };

  // Create a unique ID for the current data state (including all filters)
  const currentDataId = useMemo(() => {
    // Create a key based on all the filtering criteria
    return `${timeRange.type}-${timeRange.hoursBack}-${timeRange.startDate?.getTime()}-${timeRange.endDate?.getTime()}-${selectedAuthors.join(',')}-${hideDependencyCommits}`;
  }, [timeRange, selectedAuthors, hideDependencyCommits]);

  const chartOptions = useMemo(() => ({ // Make options memoized if they depend on state/props
    responsive: true,
    maintainAspectRatio: false, // Crucial for filling height
    animation: {
      duration: 500,
      easing: 'easeOutQuart' as const
    },
    transitions: {
      zoom: {
        animation: {
          duration: 500,
          easing: 'easeOutCubic' as const,
        },
      },
    },
    plugins: {
      legend: { labels: { color: '#fff' } },
      zoom: {
        limits: {
          x: {min: 0, max: labels.length - 1},
          y: {min: 'original' as const, max: 'original' as const}
        },
        zoom: {
          wheel: {
            enabled: false, // Disable mouse wheel zoom
          },
          pinch: {
            enabled: false, // Disable pinch zoom
          },
          drag: {
            enabled: false, // Disable drag to zoom
          },
          mode: 'x' as const,
        },
        pan: {
          enabled: false, // Disable panning
          mode: 'x' as const,
        },
      },
    },
    scales: {
      x: {
        min: minIndex,
        max: maxIndex,
        ticks: { color: '#ccc', maxRotation: 90, minRotation: 45 },
        grid: { color: 'rgba(255,255,255,0.1)' },
        stacked: mode === 'bar',
      },
      y: {
        ticks: { color: '#ccc' },
        grid: { color: 'rgba(255,255,255,0.1)' },
        stacked: mode === 'bar',
      },
    },
  }), [mode, minIndex, maxIndex, labels.length]);

  const handleAutoZoom = () => {
    if (filteredCommits.length === 0) return;
    
    
    // Get all timestamps from filtered commits
    const timestamps = filteredCommits
      .map(commit => new Date(commit.timestamp).getTime())
      .sort((a, b) => a - b);
    
    if (timestamps.length === 0) {
      return;
    }
    
    // Find bins with activity - this is the key to handling sparse data well
    const binsWithActivity = labels.map((label, index) => {
      // Check for any activity (additions or deletions)
      const hasAdditions = additionsData[index] !== undefined && additionsData[index] > 0;
      const hasDeletions = deletionsData[index] !== undefined && deletionsData[index] < 0;
      return { 
        label, 
        index, 
        hasActivity: hasAdditions || hasDeletions,
        // Store the absolute magnitude of activity for potential weighting
        activityLevel: Math.abs((additionsData[index] || 0)) + Math.abs((deletionsData[index] || 0))
      };
    }).filter(bin => bin.hasActivity);
        
    // If no bins have activity, show the entire chart
    if (binsWithActivity.length === 0) {
      setMinIndex(undefined);
      setMaxIndex(undefined);
      setLastZoomData({
        dataId: currentDataId,
        zoomRange: null
      });
      return;
    }
    
    // Get the indices of bins with activity
    const activeIndices = binsWithActivity.map(bin => bin.index);
    const minActiveIndex = Math.min(...activeIndices);
    const maxActiveIndex = Math.max(...activeIndices);
    
    // Calculate padding based on data density AND time frame size
    const dataDensity = binsWithActivity.length / labels.length;    
    // Calculate base padding from data density
    let basePadding;
    if (binsWithActivity.length <= 2) {
      // For 1-2 active bins, use very minimal padding
      basePadding = 0;
    } else if (dataDensity < 0.1) {
      // For sparse data (< 10% density), use small padding
      basePadding = 1;
    } else if (dataDensity < 0.3) {
      // For moderate density (10-30%), use medium padding
      basePadding = 2;
    } else {
      // For dense data (> 30%), use standard padding
      basePadding = 2;
    }
    
    // Adjust padding based on time frame size - less padding for larger time frames
    let timeFrameMultiplier;
    const totalHours = differenceInHours(endDate, startDate);
    if (totalHours <= 12) {
      timeFrameMultiplier = 1.0; // Full padding for 12h view
    } else if (totalHours <= 24) {
      timeFrameMultiplier = 0.75; // 75% padding for 24h view
    } else if (totalHours <= 48) {
      timeFrameMultiplier = 0.5; // 50% padding for 48h view
    } else {
      timeFrameMultiplier = 0.25; // 25% padding for 7d+ view
    }
    
    // Calculate final padding value (rounded to nearest integer)
    const padding = Math.round(basePadding * timeFrameMultiplier);
        
    // Apply padding with bounds checking
    let startIndex = Math.max(0, minActiveIndex - padding);
    let endIndex = Math.min(labels.length - 1, maxActiveIndex + padding);
    
    // For sparse data, calculate minimum range based on activity distribution
    let minRange;
    
    // For larger time frames, use tighter minimum ranges
    if (totalHours >= 168) { // 7 days
      minRange = binsWithActivity.length <= 2 
        ? binsWithActivity.length + 2
        : Math.max(4, Math.floor(labels.length * 0.1)); // 10% of total for 7d
    } else if (totalHours >= 48) { // 2 days
      minRange = binsWithActivity.length <= 2
        ? binsWithActivity.length + 3
        : Math.max(6, Math.floor(labels.length * 0.15)); // 15% of total for 48h
    } else if (totalHours >= 24) { // 1 day
      minRange = binsWithActivity.length <= 4
        ? binsWithActivity.length + 4
        : Math.max(8, Math.floor(labels.length * 0.2)); // 20% of total for 24h
    } else { // 12 hours or less
      minRange = binsWithActivity.length <= 4
        ? binsWithActivity.length + 4
        : Math.max(8, Math.floor(labels.length * 0.3)); // 30% of total for 12h
    }
        
    // If our range is too small, center on the active data
    if (endIndex - startIndex < minRange) {
      const center = Math.floor((minActiveIndex + maxActiveIndex) / 2);
      const halfRange = Math.ceil(minRange / 2);
      
      startIndex = Math.max(0, center - halfRange);
      endIndex = Math.min(labels.length - 1, center + halfRange);
      
      // If we hit one boundary, shift the other to maintain the desired range
      if (startIndex === 0) {
        endIndex = Math.min(labels.length - 1, startIndex + minRange);
      } else if (endIndex === labels.length - 1) {
        startIndex = Math.max(0, endIndex - minRange);
      }
    }
    
    // Check if we're already at a good zoom level
    const isAlreadyZoomed = 
      minIndex !== undefined && 
      maxIndex !== undefined &&
      lastZoomData.dataId === currentDataId &&
      lastZoomData.zoomRange !== null &&
      Math.abs(lastZoomData.zoomRange[0] - startIndex) <= 1 && 
      Math.abs(lastZoomData.zoomRange[1] - endIndex) <= 1;
    
    if (isAlreadyZoomed) {
      return;
    }
    
    // Update zoom state in a single operation to avoid flickering
    setMinIndex(startIndex);
    setMaxIndex(endIndex);
    
    // Save zoom data for future reference
    setLastZoomData({
      dataId: currentDataId,
      zoomRange: [startIndex, endIndex]
    });
  };

  // Function to zoom out to show all commits (up to 500)
  const handleZoomOutToAllCommits = () => {
    // Reset zoom to show full range
    setMinIndex(undefined);
    setMaxIndex(undefined);
    setLastZoomData({
      dataId: currentDataId,
      zoomRange: null
    });
    
    // Set time range to show all commits (up to 500)
    const commitDates = commits.map(c => new Date(c.timestamp)).sort((a, b) => a.getTime() - b.getTime());
    const earliestCommit = commitDates[0];
    const latestCommit = commitDates[commitDates.length - 1];
    
    // Add some padding (10%) to the time range
    const totalTime = latestCommit.getTime() - earliestCommit.getTime();
    const paddedStart = new Date(earliestCommit.getTime() - totalTime * 0.1);
    const paddedEnd = new Date(latestCommit.getTime() + totalTime * 0.1);
    
    setTimeRange({
      type: 'custom',
      startDate: paddedStart,
      endDate: paddedEnd
    });
  };

  return (
    // Outer container: Default allows scroll, lg uses fixed flex column
    <div
      ref={containerRef}
      className="bg-gray-900 min-h-screen text-white"
    >
      {/* Top Info Bar: Always visible, shrinks on lg */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-300 pt-4 pl-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300"> {/* Added text style */}
          <p>
            Total Additions:{' '}
            <span className="text-green-400 font-semibold">{totalAdditions}</span>
          </p>
          <p>
            Total Deletions:{' '}
            <span className="text-red-400 font-semibold">{totalDeletions}</span>
          </p>
          {/* Auto-Zoom Button Added Here */}
          <button
            onClick={handleAutoZoom}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700" // Adjusted size to text-xs
          >
            Auto-Zoom
          </button>
          <div className="flex items-center gap-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleZoomOutToAllCommits}
            className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700" // Adjusted size to text-xs
            title="Zoom out to show all commits in the selected range"
          >
            Show All Commits
          </button>
        </div>
        </div>
      </div>

      {/* Graph Area: Takes h-screen on mobile, flex-1 on lg */}
      <div className="h-screen relative bg-gray-900">
        {isChartReady && (
          <div className="absolute inset-0 p-2 md:p-4"> {/* Padding inside */}
            <Chart
              ref={chartRef}
              type={mode}
              data={chartData}
              options={chartOptions}
              plugins={[zoomPlugin]}
            />
          </div>
        )}
        {!isChartReady && (
             <div className="absolute inset-0 flex items-center justify-center text-gray-400">
               Loading Chart...
            </div>
         )}
      </div>

      {/* Bottom Section: Controls & More Stats. Below graph on mobile, fixed bottom bar on lg */}
      <div className="bg-gray-800 p-4 space-y-4 lg:p-2 lg:space-y-0 lg:flex-shrink-0"> {/* Adjusted padding/spacing for lg */}

        {/* Controls Section */}
        <div>
           {/* Controls heading is inside GraphControls, assuming it handles its own visibility/styling */}
           <GraphControls
              authors={allAuthors}
              selectedAuthors={selectedAuthors}
              setSelectedAuthors={setSelectedAuthors}
              showTrend={showTrend}
              setShowTrend={setShowTrend}
              mode={mode}
              setMode={setMode}
              timeRange={timeRange}
              setTimeRange={setTimeRange}
              hideDependencyCommits={hideDependencyCommits}
              setHideDependencyCommits={setHideDependencyCommits}
              onAutoZoom={handleAutoZoom}
              onZoomOutToAllCommits={handleZoomOutToAllCommits}
            />
        </div>

        {/* Stats Section (Visible commits & Time range) */}
        {/* On large screens, display these stats compactly */}
        <div className="space-y-1 text-sm text-gray-300 pt-3 lg:pt-2 lg:flex lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-1"> {/* Adjust top padding, use flex for horizontal layout on lg */}
            <p>
              Showing {visibleCommits} of {commits.length} commits
              {hideDependencyCommits && ' (dependency changes filtered)'}
            </p>
            <p>
              Time range: {format(startDate, 'MMM d, yyyy HH:mm')} to {format(endDate, 'MMM d, yyyy HH:mm')}
            </p>
        </div>
      </div>
    </div>
  );
}