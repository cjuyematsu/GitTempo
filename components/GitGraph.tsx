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
import { format, subHours, startOfHour, isBefore, addHours } from 'date-fns';
import GraphControls from './Controls';
import type { Chart as ChartJSInstance } from 'chart.js';
import type { TooltipItem } from 'chart.js';
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
  const [hideFirstHour, setHideFirstHour] = useState(false);
  const [hoursBack, setHoursBack] = useState(48);
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

  // Define filteredCommits before it's used in the useEffect
  const filteredCommits = useMemo(() => {
    // First filter by selected authors
    let filtered = commits.filter((c) => selectedAuthors.includes(c.author));
    
    // If hideFirstHour is enabled, filter out commits from the first hour
    if (hideFirstHour && filtered.length > 0) {
      // Find the earliest commit timestamp
      const timestamps = filtered.map(c => new Date(c.timestamp).getTime());
      const earliestTimestamp = Math.min(...timestamps);
      const cutoffTime = addHours(new Date(earliestTimestamp), 1);
      
      // Filter out commits that are before the cutoff time (within first hour)
      filtered = filtered.filter((c) => {
        const commitTime = new Date(c.timestamp);
        return !isBefore(commitTime, cutoffTime);
      });
    }
    
    return filtered;
  }, [commits, selectedAuthors, hideFirstHour]);

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

  // Reset zoom ONLY when time frame changes
  useEffect(() => {
    // Reset zoom to show the full range of data when time frame changes
    setMinIndex(undefined);
    setMaxIndex(undefined);
    // Also reset lastZoomData when time frame changes
    setLastZoomData({ dataId: '', zoomRange: null });
    console.log('Time frame changed - resetting zoom to show full chart');
  }, [hoursBack]); // Only depend on hoursBack

  const { labels, additionsData, deletionsData, trendData } = useMemo(() => {
    const bins: Record<string, { adds: number; dels: number }> = {};

    for (let i = 0; i < hoursBack; i++) {
      const time = format(startOfHour(subHours(new Date(), hoursBack - i)), 'MMM d, ha');
      bins[time] = { adds: 0, dels: 0 };
    }

    filteredCommits.forEach(({ timestamp, additions, deletions, nonDependencyAdditions, nonDependencyDeletions, isDependencyChange }) => {
      const hour = format(startOfHour(new Date(timestamp)), 'MMM d, ha');
      if (!bins[hour]) return;

      if (hideDependencyCommits && isDependencyChange) {
        // Only count non-dependency changes for dependency commits when toggle is on
        bins[hour].adds += nonDependencyAdditions;
        bins[hour].dels += nonDependencyDeletions;
      } else {
        // Count all changes otherwise
        bins[hour].adds += additions;
        bins[hour].dels += deletions;
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
  }, [filteredCommits, hoursBack, hideDependencyCommits]);

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
  // This is still necessary even though we don't reset zoom, since we need 
  // to track when data changes for the autoZoom function
  const currentDataId = useMemo(() => {
    // Create a key based on all the filtering criteria
    return `${hoursBack}-${selectedAuthors.join(',')}-${hideDependencyCommits}-${hideFirstHour}`;
  }, [hoursBack, selectedAuthors, hideDependencyCommits, hideFirstHour]);

  // Update chartOptions to include min and max in the x scale type
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // Turn off all animations for better zoom performance
    },
    plugins: {
      legend: {
        labels: { color: '#fff' },
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<'bar' | 'line'>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y !== undefined ? Math.abs(context.parsed.y) : 0;
            return `${label}: ${value}`;
          },
        },
      },
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
        min: minIndex, // Add this to make TypeScript happy
        max: maxIndex, // Add this to make TypeScript happy
        ticks: {
          color: '#ccc',
          maxRotation: 90,
          minRotation: 45,
        },
        grid: {
          color: 'rgba(255,255,255,0.1)',
        },
        stacked: mode === 'bar',
      },
      y: {
        ticks: {
          color: '#ccc',
        },
        grid: {
          color: 'rgba(255,255,255,0.1)',
        },
        stacked: mode === 'bar',
      },
    },
  };

  const handleAutoZoom = () => {
    if (filteredCommits.length === 0) return;
    
    console.log('Auto zoom triggered with', filteredCommits.length, 'commits');
    
    // Get all timestamps from filtered commits
    const timestamps = filteredCommits
      .map(commit => new Date(commit.timestamp).getTime())
      .sort((a, b) => a - b);
    
    if (timestamps.length === 0) {
      console.log('No valid timestamps found');
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
    
    // Log the active bins for debugging
    console.log(`Found ${binsWithActivity.length} bins with activity out of ${labels.length} total bins`);
    
    // If no bins have activity, show the entire chart
    if (binsWithActivity.length === 0) {
      console.log('No bins with activity, showing full chart');
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
    console.log(`Data density: ${dataDensity.toFixed(3)} (${binsWithActivity.length} active bins / ${labels.length} total bins)`);
    
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
    if (hoursBack <= 12) {
      timeFrameMultiplier = 1.0; // Full padding for 12h view
    } else if (hoursBack <= 24) {
      timeFrameMultiplier = 0.75; // 75% padding for 24h view
    } else if (hoursBack <= 48) {
      timeFrameMultiplier = 0.5; // 50% padding for 48h view
    } else {
      timeFrameMultiplier = 0.25; // 25% padding for 7d view
    }
    
    // Calculate final padding value (rounded to nearest integer)
    const padding = Math.round(basePadding * timeFrameMultiplier);
    
    console.log(`Using padding: ${padding} (base: ${basePadding}, multiplier: ${timeFrameMultiplier.toFixed(2)})`);
    
    // Apply padding with bounds checking
    let startIndex = Math.max(0, minActiveIndex - padding);
    let endIndex = Math.min(labels.length - 1, maxActiveIndex + padding);
    
    // For sparse data, calculate minimum range based on activity distribution
    let minRange;
    
    // For larger time frames, use tighter minimum ranges
    if (hoursBack >= 168) { // 7 days
      minRange = binsWithActivity.length <= 2 
        ? binsWithActivity.length + 2
        : Math.max(4, Math.floor(labels.length * 0.1)); // 10% of total for 7d
    } else if (hoursBack >= 48) { // 2 days
      minRange = binsWithActivity.length <= 2
        ? binsWithActivity.length + 3
        : Math.max(6, Math.floor(labels.length * 0.15)); // 15% of total for 48h
    } else if (hoursBack >= 24) { // 1 day
      minRange = binsWithActivity.length <= 4
        ? binsWithActivity.length + 4
        : Math.max(8, Math.floor(labels.length * 0.2)); // 20% of total for 24h
    } else { // 12 hours or less
      minRange = binsWithActivity.length <= 4
        ? binsWithActivity.length + 4
        : Math.max(8, Math.floor(labels.length * 0.3)); // 30% of total for 12h
    }
    
    console.log(`Using min range of ${minRange} for ${binsWithActivity.length} active bins`);
    
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
      console.log('Already properly zoomed, skipping zoom action');
      return;
    }
    
    console.log('Setting zoom range:', {
      startIndex,
      endIndex,
      startLabel: labels[startIndex],
      endLabel: labels[endIndex],
      visibleBins: endIndex - startIndex + 1,
      totalBins: labels.length,
      activeBinsInView: binsWithActivity.filter(b => b.index >= startIndex && b.index <= endIndex).length
    });
    
    // Update zoom state in a single operation to avoid flickering
    setMinIndex(startIndex);
    setMaxIndex(endIndex);
    
    // Save zoom data for future reference
    setLastZoomData({
      dataId: currentDataId,
      zoomRange: [startIndex, endIndex]
    });
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-gray-900 p-4 flex flex-col overflow-hidden"
    >
      <GraphControls
        authors={allAuthors}
        selectedAuthors={selectedAuthors}
        setSelectedAuthors={setSelectedAuthors}
        showTrend={showTrend}
        setShowTrend={setShowTrend}
        mode={mode}
        setMode={setMode}
        hideFirstHour={hideFirstHour}
        setHideFirstHour={setHideFirstHour}
        hoursBack={hoursBack}
        setHoursBack={setHoursBack}
        hideDependencyCommits={hideDependencyCommits}
        setHideDependencyCommits={setHideDependencyCommits}
        onAutoZoom={handleAutoZoom}
      />

      <div className="mb-4 text-sm text-gray-300 space-y-1">
        <p>
          Total Additions:{' '}
          <span className="text-green-400 font-semibold">{totalAdditions}</span>
        </p>
        <p>
          Total Deletions:{' '}
          <span className="text-red-400 font-semibold">{totalDeletions}</span>
        </p>
        <p>
          Showing {visibleCommits} of {commits.length} commits
          {hideDependencyCommits && ' (dependency changes filtered)'}
          {hideFirstHour && ' (first hour filtered)'}
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        {isChartReady && (
          <Chart
            ref={chartRef}
            type={mode}
            data={chartData}
            options={chartOptions}
            plugins={[zoomPlugin]}
          />
        )}
      </div>
    </div>
  );
}