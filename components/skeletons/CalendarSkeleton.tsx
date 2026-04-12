/**
 * Calendar Skeleton Loader
 * Displayed while FullCalendar is being lazy-loaded
 */

export default function CalendarSkeleton() {
  return (
    <div className="w-full h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => (
          <div key={day} className="h-10 flex items-center justify-center">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}

        {/* Calendar cells */}
        {Array.from({ length: 35 }).map((_, i) => (
          <div
            key={i}
            className="h-20 bg-gray-100 dark:bg-gray-750 rounded border border-gray-200 dark:border-gray-700 p-2"
          >
            <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            {Math.random() > 0.7 && (
              <div className="h-3 w-full bg-blue-200 dark:bg-blue-800 rounded"></div>
            )}
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Chargement du calendrier...</p>
        </div>
      </div>
    </div>
  );
}
