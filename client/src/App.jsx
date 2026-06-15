import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import HeroCounter from './components/HeroCounter.jsx';
import MetricCard from './components/MetricCard.jsx';
import CityBreakdown from './components/CityBreakdown.jsx';
import GrowthChart from './components/GrowthChart.jsx';

const AUTO_REFRESH_MS = 60 * 1000; // 60 seconds

function useStats() {
  const [data, setData]           = useState(null);
  const [error, setError]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats().finally(() => setIsLoading(false));
  }, [fetchStats]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(fetchStats, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchStats]);

  const manualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Tell the server to re-scrape
      await fetch('/api/refresh', { method: 'POST' });
      // Wait a moment for the scrape to complete, then fetch fresh stats
      await new Promise((r) => setTimeout(r, 2000));
      await fetchStats();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchStats]);

  return { data, error, isLoading, isRefreshing, manualRefresh };
}

export default function App() {
  const { data, error, isLoading, isRefreshing, manualRefresh } = useStats();

  const current = data?.current;
  const history = data?.history;
  const cities  = current?.cities;
  // Austin is the primary market with the most complete data (ride %, counts)
  const austin  = cities?.austin;
  // Metric cards use Austin data (most complete); cybercabs falls back to global max
  const totals = {
    riderVehicles:       austin?.riderVehicles,
    inactive:            austin?.inactive,
    cybercabs:           austin?.cybercabs ?? current?.totals?.cybercabs,
    unsupervisedPercent: austin?.unsupervisedPercent,
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Header
        lastUpdated={current?.lastUpdated}
        onRefresh={manualRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pb-16">

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-32 text-muted">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Loading live data…</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {!isLoading && error && !data && (
          <div className="flex items-center justify-center py-32">
            <div className="card text-center max-w-md">
              <p className="text-accent font-semibold mb-2">Could not load data</p>
              <p className="text-sm text-muted">{error}</p>
              <p className="text-xs text-muted mt-3">Make sure the backend server is running on port 3001.</p>
            </div>
          </div>
        )}

        {!isLoading && data && (
          <>
            {/* Hero */}
            <HeroCounter
              unsupervised={current?.totals?.unsupervised}
              unsupervisedPercent={austin?.unsupervisedPercent}
              totalRides={austin?.totalRides}
            />

            {/* Metric Cards */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 animate-fade-in">
              <MetricCard
                label="Rider Vehicles"
                value={totals?.riderVehicles}
                icon="🚗"
                sublabel="Active Tesla rider fleet"
              />
              <MetricCard
                label="Inactive (30d)"
                value={totals?.inactive}
                icon="💤"
                sublabel="Vehicles not seen in 30 days"
              />
              <MetricCard
                label="Cybercabs"
                value={totals?.cybercabs}
                icon="⚡"
                sublabel="Cybercab test fleet vehicles"
                accent
              />
              <MetricCard
                label="Unsupervised %"
                value={totals?.unsupervisedPercent ?? austin?.unsupervisedPercent}
                unit="%"
                icon="🤖"
                sublabel="Rides without safety driver (7d)"
                accent
              />
            </section>

            {/* City Breakdown */}
            <section className="mb-6 animate-fade-in">
              <CityBreakdown cities={cities} />
            </section>

            {/* Historical Chart */}
            {history?.length > 0 && (
              <section className="animate-fade-in">
                <GrowthChart history={history} />
              </section>
            )}

            {/* Footer note */}
            <p className="text-center text-xs text-muted mt-10">
              Data sourced from{' '}
              <a
                href="https://robotaxitracker.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dim hover:text-white underline underline-offset-2 transition-colors"
              >
                robotaxitracker.com
              </a>
              {' '}· refreshes every 10 minutes · not affiliated with Tesla
            </p>
          </>
        )}
      </main>
    </div>
  );
}
