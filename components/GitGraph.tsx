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
import { Chart } from 'react-chartjs-2';
import { useEffect, useMemo, useRef, useState } from 'react';
import { format, subHours, startOfHour } from 'date-fns';
import GraphControls from './Controls';
import type { Chart as ChartJSInstance } from 'chart.js';
import type { TooltipItem } from 'chart.js';

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

interface CommitDataPoint {
  timestamp: string;
  author: string;
  additions: number;
  deletions: number;
}

interface Props {
  repo: string;
  commits: CommitDataPoint[];
}

export default function GitGraph({ commits }: Props) {
  const allAuthors = [...new Set(commits.map((c) => c.author))];

  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(allAuthors);
  const [showTrend, setShowTrend] = useState(true);
  const [mode, setMode] = useState<'bar' | 'line'>('bar');
  const [includeInitial, setIncludeInitial] = useState(true);
  const [hoursBack, setHoursBack] = useState(48);
  const chartRef = useRef<ChartJSInstance<'bar' | 'line'> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Delay render until client-side
  const [isChartReady, setIsChartReady] = useState(false);
  useEffect(() => {
    setIsChartReady(true);
  }, []);

  const filteredCommits = useMemo(() => {
    let filtered = commits.filter((c) => selectedAuthors.includes(c.author));
    if (!includeInitial && commits.length > 0) {
      const first = commits[0];
      filtered = filtered.filter((c) => c !== first);
    }
    return filtered;
  }, [commits, selectedAuthors, includeInitial]);

  const { labels, additionsData, deletionsData, trendData } = useMemo(() => {
    const bins: Record<string, { adds: number; dels: number }> = {};

    for (let i = 0; i < hoursBack; i++) {
      const time = format(startOfHour(subHours(new Date(), hoursBack - i)), 'MMM d, ha');
      bins[time] = { adds: 0, dels: 0 };
    }

    filteredCommits.forEach(({ timestamp, additions, deletions }) => {
      const hour = format(startOfHour(new Date(timestamp)), 'MMM d, ha');
      if (!bins[hour]) return;
      bins[hour].adds += additions;
      bins[hour].dels += deletions;
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
  }, [filteredCommits, hoursBack]);

  const totalAdditions = additionsData.reduce((a, b) => a + b, 0);
  const totalDeletions = deletionsData.reduce((a, b) => a + Math.abs(b), 0);

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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
    },
    scales: {
      x: {
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
    if (!chartRef.current) return;

    const first = additionsData.findIndex((val, i) => val !== 0 || deletionsData[i] !== 0);
    const last = [...additionsData]
      .map((val, i) => ({ val, i }))
      .reverse()
      .find(({ val, i }) => val !== 0 || deletionsData[i] !== 0)?.i;

    if (first !== -1 && last !== undefined && chartRef.current?.scales?.x) {
      const scale = chartRef.current.scales.x;
      scale.options.min = first;
      scale.options.max = last;
      chartRef.current.update();
    }
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
        includeInitial={includeInitial}
        setIncludeInitial={setIncludeInitial}
        hoursBack={hoursBack}
        setHoursBack={setHoursBack}
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
      </div>

      <div className="flex-1 overflow-hidden">
        {isChartReady && (
          <Chart
            ref={chartRef}
            type={mode}
            data={chartData}
            options={chartOptions}
          />
        )}
      </div>
    </div>
  );
}
