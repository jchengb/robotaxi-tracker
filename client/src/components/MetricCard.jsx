import React from 'react';

export default function MetricCard({ label, value, unit, sublabel, icon, accent }) {
  const formatted = value != null
    ? (typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value)
    : '—';

  return (
    <div className="card flex flex-col gap-3 hover:border-accent/40 transition-colors group">
      <div className="flex items-center justify-between">
        <span className="label-text">{label}</span>
        {icon && (
          <span className={`text-lg ${accent ? 'text-accent' : 'text-muted'} opacity-70 group-hover:opacity-100 transition-opacity`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={`stat-value ${accent ? 'text-accent' : 'text-white'}`}>
          {formatted}
        </span>
        {unit && <span className="text-muted text-sm font-medium mb-1">{unit}</span>}
      </div>
      {sublabel && <p className="text-xs text-muted leading-relaxed">{sublabel}</p>}
    </div>
  );
}
