import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';

interface GraphControlsProps {
  authors: string[];
  selectedAuthors: string[];
  setSelectedAuthors: (authors: string[]) => void;
  showTrend: boolean;
  setShowTrend: (val: boolean) => void;
  mode: 'bar' | 'line';
  setMode: (mode: 'bar' | 'line') => void;
  hideFirstHour: boolean;
  setHideFirstHour: (val: boolean) => void;
  timeRange: {
    type: 'hours' | 'custom';
    hoursBack?: number;
    startDate?: Date;
    endDate?: Date;
  };
  setTimeRange: (val: {
    type: 'hours' | 'custom';
    hoursBack?: number;
    startDate?: Date;
    endDate?: Date;
  }) => void;
  hideDependencyCommits: boolean;
  setHideDependencyCommits: (val: boolean) => void;
  onAutoZoom: () => void;
  onZoomOutToAllCommits: () => void;
}

export default function GraphControls({
  authors,
  selectedAuthors,
  setSelectedAuthors,
  showTrend,
  setShowTrend,
  mode,
  setMode,
  hideFirstHour,
  setHideFirstHour,
  timeRange,
  setTimeRange,
  hideDependencyCommits,
  setHideDependencyCommits,
}: GraphControlsProps) {
  const router = useRouter();
  const contributorsRef = useRef<HTMLDivElement>(null);
  const [showContributors, setShowContributors] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState({
    startDate: timeRange.startDate || new Date(),
    endDate: timeRange.endDate || new Date(),
  });

  const toggleAuthor = (author: string) => {
    if (selectedAuthors.includes(author)) {
      setSelectedAuthors(selectedAuthors.filter((a) => a !== author));
    } else {
      setSelectedAuthors([...selectedAuthors, author]);
    }
  };

  const handleHoursChange = (hours: number) => {
    setTimeRange({
      type: 'hours',
      hoursBack: hours,
    });
  };

  const handleDateRangeToggle = () => {
    setShowDatePicker(!showDatePicker);
    if (!showDatePicker && timeRange.type !== 'custom') {
      // Initialize with current time range if switching to custom
      setTempDateRange({
        startDate: new Date(Date.now() - (timeRange.hoursBack || 48) * 60 * 60 * 1000),
        endDate: new Date(),
      });
    }
  };

  const handleApplyDateRange = () => {
    setTimeRange({
      type: 'custom',
      startDate: tempDateRange.startDate,
      endDate: tempDateRange.endDate,
    });
    setShowDatePicker(false);
  };

  const formatDateForInput = (date: Date) => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contributorsRef.current &&
        !contributorsRef.current.contains(event.target as Node)
      ) {
        setShowContributors(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="mb-4 space-y-3">
      {/* Back button and title row */}
      <div className="flex items-center space-x-4 mb-2">
        <button
          onClick={() => router.push('/')} // Make sure router is configured if using Next.js Pages Router
          className="flex items-center text-indigo-400 hover:text-indigo-300 text-sm"
        >
          Back to search 
        </button>
        {/* --- CONTRIBUTORS DROPDOWN --- */}
        {/* Apply flex-shrink-0 to the wrapper div, not the button */}
        <div className="relative flex-shrink-0" ref={contributorsRef}>
          <button
            type="button" // Explicitly set button type
            // Remove flex-shrink-0 from button itself
            className="px-3 py-1 bg-gray-700 rounded text-sm flex items-center hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            onClick={() => {
              setShowContributors((prev) => !prev);
            }}
            aria-haspopup="true" // Accessibility
            aria-expanded={showContributors} // Accessibility
          >
            Contributors {authors.length > 0 ? `(${selectedAuthors.length}/${authors.length})` : ''}
            {/* Simple SVG caret down icon */}
            <svg className={`ml-1.5 h-4 w-4 transition-transform duration-200 ${showContributors ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {/* Dropdown Panel */}
          {showContributors && (
            <div className="absolute z-20 mt-1.5 w-fit min-w-[12rem] origin-top-left rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none max-h-80 overflow-y-auto">              <div className="p-2 space-y-1"> {/* Reduced padding slightly */}
                {authors.length === 0 && <div className="px-2 py-1 text-sm text-gray-400">No contributors found</div>}
                {authors.map((author) => (
                  <label
                    key={author}
                    className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-200 rounded hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAuthors.includes(author)}
                      onChange={() => toggleAuthor(author)}
                      className="accent-indigo-500 h-4 w-4 rounded border-gray-600" // Style checkbox
                    />
                    <span className="whitespace-normal truncate max-w-[200px]" title={author}>{author}</span> {/* Truncate, add title */}
                  </label>
                ))}
              </div>
              {/* Select/Deselect All Section */}
              {authors.length > 0 && (
                <div className="border-t border-gray-700 px-3 py-2 flex justify-start space-x-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedAuthors([...authors])} // Select all *currently loaded* authors
                    className="text-indigo-400 hover:underline focus:outline-none"
                  >
                    Select All ({authors.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAuthors([])}
                    className="text-indigo-400 hover:underline focus:outline-none"
                  >
                    Deselect All
                  </button>
                </div>
               )}
            </div>
          )}
        </div> {/* End Contributors Wrapper */}

      </div>

      {/* --- CONTROLS ROW (Horizontal Scroll Style) --- */}
      <div className="flex gap-x-4 items-center overflow-x-auto whitespace-nowrap pb-2 pr-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"> {/* Added gap-x, optional scrollbar styling */}

        
        {/* --- TOGGLES --- */}
        <div className="flex items-center gap-x-4 text-sm flex-shrink-0"> {/* Use gap-x */}
          <label className="flex items-center gap-x-2 cursor-pointer">
            <input type="checkbox" checked={showTrend} onChange={(e) => setShowTrend(e.target.checked)} className="accent-indigo-500 h-4 w-4 rounded border-gray-600"/>
            Trend
          </label>
          <label className="flex items-center gap-x-2 cursor-pointer">
            <input type="checkbox" checked={hideFirstHour} onChange={(e) => setHideFirstHour(e.target.checked)} className="accent-indigo-500 h-4 w-4 rounded border-gray-600"/>
            Hide 1st Hr
          </label>
          <label className="flex items-center gap-x-2 cursor-pointer">
            <input type="checkbox" checked={hideDependencyCommits} onChange={(e) => setHideDependencyCommits(e.target.checked)} className="accent-indigo-500 h-4 w-4 rounded border-gray-600"/>
            Hide Dep.
          </label>
        </div>

        {/* --- MODE BUTTONS --- */}
        <div className="flex items-center gap-x-2 text-sm flex-shrink-0">
          <span className="font-medium text-gray-300">Mode:</span>
          <button type="button" className={`px-2 py-1 rounded text-xs ${mode === 'bar' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} onClick={() => setMode('bar')}>Bar</button>
          <button type="button" className={`px-2 py-1 rounded text-xs ${mode === 'line' ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} onClick={() => setMode('line')}>Line</button>
        </div>

        {/* --- TIME RANGE --- */}
        <div className="flex items-center gap-x-1.5 text-sm flex-shrink-0"> {/* Slightly reduced gap */}
          <span className="font-medium text-gray-300 mr-1">Range:</span>
          {[12, 24, 48, 72, 168, 336, 720].map((h) => (
            <button
              type="button"
              key={h}
              onClick={() => handleHoursChange(h)}
              className={`px-2 py-1 rounded text-xs transition-colors ${timeRange.type === 'hours' && timeRange.hoursBack === h ? 'bg-indigo-600 text-white ring-1 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
              {h === 168 ? '7d' : h === 336 ? '14d' : h === 720 ? '30d' : `${h}h`}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDateRangeToggle}
            className={`px-2 py-1 rounded text-xs transition-colors ${timeRange.type === 'custom' || showDatePicker ? 'bg-indigo-600 text-white ring-1 ring-indigo-400' : 'bg-gray-700 hover:bg-gray-600'}`}
            aria-controls="date-range-picker" // Link button to the picker
            aria-expanded={showDatePicker}   // Indicate state
          >
            Custom
          </button>
        </div>

      </div> {/* End Controls Row */}

      {/* --- CUSTOM DATE RANGE PICKER --- */}
      {/* Conditionally render with transition for smoother appearance */}
      <div
        id="date-range-picker" // Match aria-controls
        className={`transition-all duration-300 ease-in-out overflow-hidden ${showDatePicker ? 'max-h-40 mt-2' : 'max-h-0 mt-0'}`}
      >
        <div className="p-3 bg-gray-800 rounded-md flex flex-wrap gap-4 items-end border border-gray-700">
            <div className="flex flex-col">
              <label htmlFor="start-date-input" className="text-xs text-gray-300 mb-1">Start Date</label>
              <input
                id="start-date-input"
                type="datetime-local"
                value={formatDateForInput(tempDateRange.startDate)}
                onChange={(e) => setTempDateRange({...tempDateRange, startDate: e.target.value ? new Date(e.target.value) : new Date() })}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none" // Added appearance-none
                max={formatDateForInput(tempDateRange.endDate)}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="end-date-input" className="text-xs text-gray-300 mb-1">End Date</label>
              <input
                id="end-date-input"
                type="datetime-local"
                value={formatDateForInput(tempDateRange.endDate)}
                onChange={(e) => setTempDateRange({...tempDateRange, endDate: e.target.value ? new Date(e.target.value) : new Date() })}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none" // Added appearance-none
                min={formatDateForInput(tempDateRange.startDate)}
              />
            </div>
            <div className="flex gap-2 pt-3">
              <button type="button" onClick={handleApplyDateRange} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-800">Apply</button>
              <button type="button" onClick={() => setShowDatePicker(false)} className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800">Cancel</button>
            </div>
          </div>
      </div> {/* End Date Picker Container */}

    </div> // End Main Wrapper
  );
}