import React, { useEffect, useRef, useState } from 'react';

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (target == null) return;
    const start = prev.current;
    const startTime = performance.now();
    const delta = target - start;
    if (delta === 0) return;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(start + delta * eased));
      if (progress < 1) requestAnimationFrame(tick);
      else prev.current = target;
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

export default function HeroCounter({ unsupervised, unsupervisedPercent, totalRides }) {
  const displayed = useCountUp(unsupervised ?? 0);

  return (
    <div className="text-center py-14 sm:py-20 animate-fade-in">
      {/* Live badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/10 mb-6">
        <span className="live-dot w-2 h-2 rounded-full bg-accent" />
        <span className="text-xs font-semibold text-accent uppercase tracking-widest">即時</span>
      </div>

      {/* Big number */}
      <div className="hero-glow font-black text-[clamp(6rem,20vw,10rem)] leading-none text-white tabular-nums mb-2">
        {unsupervised != null ? displayed : '—'}
      </div>

      <p className="text-xl sm:text-2xl font-semibold text-white/90 tracking-tight mb-1">
        無人監督車輛數
      </p>
      <p className="text-sm text-muted mb-6">
        目前正在無安全駕駛員情況下行駛的 Tesla 機器人計程車
      </p>

      {/* Sub-stats pill row */}
      {(unsupervisedPercent != null || totalRides != null) && (
        <div className="inline-flex items-center gap-4 sm:gap-6 bg-card border border-border rounded-full px-6 py-3 text-sm">
          {unsupervisedPercent != null && (
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">{unsupervisedPercent}%</span>
              <span className="text-muted">無人監督（7天）</span>
            </div>
          )}
          {unsupervisedPercent != null && totalRides != null && (
            <div className="w-px h-4 bg-border" />
          )}
          {totalRides != null && (
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{totalRides}</span>
              <span className="text-muted">趟次（7天）</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
