interface ViewSelectorProps {
  selectedView: 'current-week' | 'two-weeks' | 'month';
  onViewChange: (view: 'current-week' | 'two-weeks' | 'month') => void;
  daysPerWeek?: 5 | 7;
  onDaysPerWeekChange?: (days: 5 | 7) => void;
}

export function ViewSelector({
  selectedView,
  onViewChange,
  daysPerWeek = 5,
  onDaysPerWeekChange
}: ViewSelectorProps) {
  const views = [
    { id: 'current-week' as const, label: 'Current Week', icon: '📅' },
    { id: 'two-weeks' as const, label: '2 Week View', icon: '📆' },
    { id: 'month' as const, label: 'Month View', icon: '🗓️' },
  ];

  // Only show toggle for week views
  const showDaysToggle = selectedView !== 'month' && onDaysPerWeekChange;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
      {/* View Selector Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`
              flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 transition-all font-medium
              ${
                selectedView === view.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg hover:bg-blue-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:shadow-sm hover:bg-gray-50'
              }
            `}
          >
            <span className="text-base sm:text-lg">{view.icon}</span>
            <span className="font-medium text-xs sm:text-sm hidden sm:inline">{view.label}</span>
          </button>
        ))}
      </div>

      {/* 5/7 Day Toggle - Only for week views */}
      {showDaysToggle && (
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
          <button
            onClick={() => onDaysPerWeekChange(5)}
            className={`
              px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all
              ${daysPerWeek === 5
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Mon-Fri
          </button>
          <button
            onClick={() => onDaysPerWeekChange(7)}
            className={`
              px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all
              ${daysPerWeek === 7
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            <span className="hidden sm:inline">Full Week</span>
            <span className="sm:hidden">7 Days</span>
          </button>
        </div>
      )}
    </div>
  );
}
