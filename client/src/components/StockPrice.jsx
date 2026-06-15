import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

const RANGE_OPTIONS = [
  { label: '1個月', days: 30 },
  { label: '3個月', days: 90 },
];

export default function StockPrice() {
  const [data, setData]   = useState(null);
  const [error, setError] = useState(null);
  const [range, setRange] = useState('1個月');

  useEffect(() => {
    const load = () =>
      fetch('/api/stock')
        .then((r) => r.json())
        .then((d) => { if (!d.error) setData(d); else setError(d.error); })
        .catch((e) => setError(e.message));
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (error || !data) return null;

  const change    = data.price - data.previousClose;
  const changePct = (change / data.previousClose) * 100;
  const isUp      = change >= 0;
  const color     = isUp ? 'rgba(74,222,128,1)' : 'rgba(248,113,113,1)';
  const textColor = isUp ? 'text-green-400' : 'text-red-400';

  const days = RANGE_OPTIONS.find((o) => o.label === range)?.days ?? 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = (data.history ?? []).filter((h) => new Date(h.date) >= cutoff);

  const chartData = {
    labels: filtered.map((h) => {
      try { return format(parseISO(h.date), 'M/d'); } catch { return h.date; }
    }),
    datasets: [{
      data: filtered.map((h) => h.close),
      borderColor: color,
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: true,
      backgroundColor: (ctx) => {
        const grad = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.canvas.height);
        grad.addColorStop(0,   color.replace('1)', '0.25)'));
        grad.addColorStop(1,   color.replace('1)', '0)'));
        return grad;
      },
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1c1c1c',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont:  { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => items[0].label,
          label: (item)  => `  $${item.parsed.y.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid:   { color: 'rgba(42,42,42,0.6)', drawBorder: false },
        ticks:  { color: '#6b7280', font: { family: 'Inter', size: 10 }, maxTicksLimit: 6, maxRotation: 0 },
        border: { display: false },
      },
      y: {
        position: 'right',
        grid:     { color: 'rgba(42,42,42,0.6)', drawBorder: false },
        ticks:    { color: '#6b7280', font: { family: 'Inter', size: 10 }, callback: (v) => `$${v}` },
        border:   { display: false },
      },
    },
  };

  const marketLabel = {
    REGULAR:   { text: '開盤中', cls: 'text-green-400' },
    PRE:       { text: '盤前交易', cls: 'text-yellow-400' },
    POST:      { text: '盤後交易', cls: 'text-yellow-400' },
    CLOSED:    { text: '已收盤', cls: 'text-muted' },
    POSTPOST:  { text: '已收盤', cls: 'text-muted' },
  }[data.marketState] ?? { text: data.marketState, cls: 'text-muted' };

  return (
    <div className="card">
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="label-text mb-0.5">Tesla 股價</h2>
          <p className="text-xs text-muted">TSLA · NASDAQ</p>
        </div>
        <span className={`text-xs font-semibold ${marketLabel.cls}`}>{marketLabel.text}</span>
      </div>

      {/* Price + change */}
      <div className="flex items-end gap-3 mb-5">
        <span className="text-4xl font-black text-white tabular-nums leading-none">
          ${data.price?.toFixed(2)}
        </span>
        <div className={`flex flex-col text-sm font-semibold mb-0.5 ${textColor}`}>
          <span>{isUp ? '+' : ''}{change.toFixed(2)}</span>
          <span>{isUp ? '+' : ''}{changePct.toFixed(2)}%</span>
        </div>
      </div>

      {/* Range toggle */}
      <div className="flex items-center justify-end gap-1 mb-3">
        <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.label}
              onClick={() => setRange(o.label)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors
                ${range === o.label ? 'bg-card text-white shadow-sm border border-border' : 'text-muted hover:text-white'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-40">
        {filtered.length > 0
          ? <Line data={chartData} options={chartOptions} />
          : <div className="h-full flex items-center justify-center text-muted text-sm">無資料</div>
        }
      </div>

      <p className="text-xs text-muted mt-3">
        每 5 分鐘更新 · 來源：Yahoo Finance · 非投資建議
      </p>
    </div>
  );
}
