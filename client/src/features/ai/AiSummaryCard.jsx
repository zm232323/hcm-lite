import { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Bot, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';

export function AiSummaryCard({ role = 'hr', filters = {} }) {
  const [bullets, setBullets] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fallback, setFallback] = useState(false);

  const isHr = role === 'hr';
  const title = isHr ? 'AI HR Intelligence' : 'AI Executive Brief';
  const description = isHr
    ? 'Automated briefing analyzing attendance bottlenecks, leave anomalies, and workforce capacity.'
    : 'Automated executive summary analyzing payroll trends, turnover risks, and organizational health.';

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    setFallback(false);

    try {
      const q = new URLSearchParams();
      if (filters.from) q.set('from', filters.from);
      if (filters.to) q.set('to', filters.to);
      if (filters.departmentId) q.set('departmentId', filters.departmentId);

      const res = await api.post(`/ai/summary?${q.toString()}`, {});
      setBullets(res.data.bullets || []);
      setFallback(!!res.data.fallback);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        'The executive summary service is currently unavailable. Please try again later.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-background p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        {bullets && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            <Sparkles className="h-2.5 w-2.5" /> AI-generated
          </span>
        )}
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="rounded-xl border border-border bg-card/60 p-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium">
            <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
            <span>Analyzing KPI metrics and operational trends...</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Synthesizing headcount, attendance, and payroll records without guessing
          </p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : bullets ? (
        <div className="space-y-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-sm">
            {bullets.map((bullet, i) => (
              <div key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <span className="flex-1">{bullet}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span>Derived strictly from active system records</span>
            <button
              onClick={handleGenerateSummary}
              className="text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <RefreshCw className="h-3 w-3" /> Refresh Briefing
            </button>
          </div>
        </div>
      ) : (
        <div className="pt-2">
          <button
            id={`generate-summary-${role}-btn`}
            onClick={handleGenerateSummary}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Generate {isHr ? 'HR Briefing' : 'Executive Report'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
