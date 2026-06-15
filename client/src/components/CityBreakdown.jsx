import React from 'react';

const CITY_CONFIG = {
  austin:  { emoji: '🤠', color: 'bg-accent' },
  bayarea: { emoji: '🌉', color: 'bg-blue-500' },
  dallas:  { emoji: '⭐', color: 'bg-yellow-500' },
  houston: { emoji: '🚀', color: 'bg-purple-500' },
};

function CityRow({ cityKey, data, maxUnsupervised }) {
  const cfg = CITY_CONFIG[cityKey] ?? { emoji: '📍', color: 'bg-gray-500' };
  const unsupervised = data.unsupervised ?? 0;
  const pct = maxUnsupervised > 0 ? (unsupervised / maxUnsupervised) * 100 : 0;
  const hasError = !!data.error;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0 group">
      {/* City label */}
      <div className="flex items-center gap-2.5 w-28 shrink-0">
        <span className="text-base">{cfg.emoji}</span>
        <span className="text-sm font-semibold text-white/90">{data.label}</span>
      </div>

      {/* Bar */}
      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
        {hasError ? (
          <div className="h-full w-full bg-border/50 rounded-full" />
        ) : (
          <div
            className={`h-full ${cfg.color} rounded-full bar-fill opacity-80 group-hover:opacity-100 transition-opacity`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 shrink-0 text-right">
        <div className="w-24 whitespace-nowrap">
          <span className="text-sm font-bold tabular-nums">
            {hasError ? '—' : (unsupervised || '—')}
          </span>
          <span className="text-xs text-muted ml-1">無監督</span>
        </div>
        <div className="w-20 hidden sm:block whitespace-nowrap">
          <span className="text-xs text-muted tabular-nums">
            {hasError ? '—' : (data.riderVehicles != null ? `${data.riderVehicles} 乘客車` : '—')}
          </span>
        </div>
        {data.unsupervisedPercent != null && (
          <div className="w-14 hidden md:block">
            <span className="text-xs font-semibold text-accent tabular-nums">
              {data.unsupervisedPercent}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CityBreakdown({ cities }) {
  if (!cities) return null;

  const entries = Object.entries(cities);
  const maxUnsupervised = Math.max(...entries.map(([, d]) => d.unsupervised ?? 0), 1);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="label-text">各城市分布</h2>
        <span className="text-xs text-muted">Tesla · 無人監督</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-4 pb-2 text-xs text-muted">
        <span className="w-28 shrink-0">城市</span>
        <span className="flex-1">車隊占比</span>
        <span className="shrink-0 text-right w-24 mr-4 sm:mr-[6rem] md:mr-[9rem]">數量</span>
      </div>

      {entries.map(([key, data]) => (
        <CityRow key={key} cityKey={key} data={data} maxUnsupervised={maxUnsupervised} />
      ))}
    </div>
  );
}
