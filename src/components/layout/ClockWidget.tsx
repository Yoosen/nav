import { useEffect, useState } from 'react';
import { getLunarDate } from '../../utils/lunar';

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function pad(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function ClockWidget({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const weekday = WEEKDAYS[now.getDay()];
  const lunar = getLunarDate(now);
  const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center leading-none select-none pointer-events-none">
        <div className="text-lg font-semibold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
          {timeStr}
        </div>
        <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {weekday} · {lunar}
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-col items-center justify-center leading-none select-none pointer-events-none">
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-slate-800 dark:text-slate-100">
        {timeStr}
      </div>
      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {dateStr} {weekday} · {lunar}
      </div>
    </div>
  );
}
