import { Calendar, CheckCircle2, Clock, ShieldAlert } from 'lucide-react';

export function LeaveBalanceCards({ balances = [], loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (!balances.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
      {balances.map((b) => (
        <div key={b.leaveTypeId} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground truncate">{b.name}</h4>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                b.isPaid
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
                  : 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {b.isPaid ? 'Paid' : 'Unpaid'}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
            <div>
              <span className="text-[10px] text-muted-foreground block">Available</span>
              <span className="text-xl font-bold font-mono text-primary">
                {b.quota !== null ? b.remaining : '∞'}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                {b.quota !== null ? `/ ${b.quota} days` : 'unlimited'}
              </span>
            </div>

            <div className="text-right text-[11px] font-mono text-muted-foreground space-y-0.5">
              <div>Used: <strong className="text-foreground">{b.used}d</strong></div>
              <div>Pending: <strong className="text-amber-600 dark:text-amber-400">{b.pending}d</strong></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
