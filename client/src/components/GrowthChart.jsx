import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RANGE_OPTIONS = [
  { label: '7D',  days: 7  },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: 'All', days: Infinity },
];

export default function GrowthChart({ history }) {
  const [range, setRange] = React.useState('30D');

  const filtered = useMemo(() => {
    if (!history?.length) return [];
    const opt = RANGE_OPTIONS.find((o) => o.label === range);
    if (!opt || opt.days === Infinity) return history;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - opt.days);
    return history.filter((h) => new Date(h.date) >= cutoff);
  }, [history, range]);

  const labels = filtered.map((h) => {
    try { return format(parseISO(h.date), 'MMM d'); }
    catch { return h.date; }
  });

  const makeGradient = (ctx, color) => {
    const grad = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    grad.addColorStop(0,   color.replace('1)', '0.35)'));
    grad.addColorStop(0.7, color.replace('1)', '0.08)'));
    grad.addColorStop(1,   color.replace('1)', '0)'));
    return grad;
  };

  const data = {
    labels,
    datasets: [
      {
        label: '無人監督車輛',
        data: filtered.map((h) => h.unsupervised),
        borderColor: 'rgba(227, 25, 55, 1)',
        backgroundColor: (ctx) => makeGradient(ctx.chart.ctx, 'rgba(227, 25, 55, 1)'),
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: filtered.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgba(227, 25, 55, 1)',
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2,
      },
      {
        label: '乘客車輛',
        data: filtered.map((h) => h.riderVehicles),
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: (ctx) => makeGradient(ctx.chart.ctx, 'rgba(99, 102, 241, 1)'),
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: filtered.length > 60 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: '#6b7280',
          font: { family: 'Inter', size: 12 },
          boxWidth: 10,
          boxHeight: 10,
          borderRadius: 3,
          useBorderRadius: true,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: '#1c1c1c',
        borderColor: '#2a2a2a',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#9ca3af',
        titleFont: { family: 'Inter', weight: '600', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => `  ${ctx.dataset.label}: ${ctx.parsed.y}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(42, 42, 42, 0.6)', drawBorder: false },
        ticks: {
          color: '#6b7280',
          font: { family: 'Inter', size: 11 },
          maxTicksLimit: 8,
          maxRotation: 0,
        },
        border: { display: false },
      },
      y: {
        grid: { color: 'rgba(42, 42, 42, 0.6)', drawBorder: false },
        ticks: {
          color: '#6b7280',
          font: { family: 'Inter', size: 11 },
          stepSize: 5,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="label-text mb-0.5">車隊成長趨勢</h2>
          <p className="text-xs text-muted">無人監督及乘客車輛的歷史變化</p>
        </div>
        <div className="flex items-center gap-1 bg-surface rounded-lg p-1 border border-border">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => setRange(opt.label)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors
                ${range === opt.label
                  ? 'bg-card text-white shadow-sm border border-border'
                  : 'text-muted hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 sm:h-80">
        {filtered.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-muted text-sm">
            所選時間範圍內無資料
          </div>
        )}
      </div>
    </div>
  );
}
