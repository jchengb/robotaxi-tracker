import React from 'react';

export default function Header({ lastUpdated, onRefresh, isRefreshing }) {
  const ago = React.useMemo(() => {
    if (!lastUpdated) return null;
    const diff = Math.floor((Date.now() - new Date(lastUpdated)) / 1000);
    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  }, [lastUpdated]);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Tesla-style wordmark */}
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center shrink-0">
            <svg viewBox="0 0 100 100" className="w-5 h-5 fill-white">
              <path d="M50 8C26.8 8 8 26.8 8 50s18.8 42 42 42 42-18.8 42-42S73.2 8 50 8zm0 10c17.7 0 32 14.3 32 32S67.7 82 50 82 18 67.7 18 50s14.3-32 32-32zm-2 14v36h4V32h-4z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight tracking-tight">
              Robotaxi Unsupervised Tracker
            </h1>
            <p className="text-xs text-muted hidden sm:block">
              Tesla FSD / Cybercab · Austin · Bay Area · Dallas · Houston
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {ago && (
            <span className="text-xs text-muted hidden sm:flex items-center gap-1.5">
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Updated {ago}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-medium
                       hover:border-accent hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <path d="M4 4v5h5M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 9a9 9 0 0 1 15-4.5M20 15a9 9 0 0 1-15 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
    </header>
  );
}
