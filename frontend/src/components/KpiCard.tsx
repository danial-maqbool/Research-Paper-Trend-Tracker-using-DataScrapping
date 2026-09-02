import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  icon: LucideIcon;
  colorClass?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  colorClass = 'text-brand-400 bg-brand-500/10 border-brand-500/20',
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</p>
          <p className="text-2xl font-bold text-white tracking-tight mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg border ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || change !== undefined) && (
        <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
          {subtitle && <span className="text-slate-400 truncate max-w-[180px]">{subtitle}</span>}
          {change !== undefined && (
            <span
              className={`font-mono text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                change >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
              }`}
            >
              {change >= 0 ? `+${change}%` : `${change}%`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
