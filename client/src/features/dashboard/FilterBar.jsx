import { useState, useEffect } from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';
import api from '../../lib/api';

function getLocalDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function FilterBar({ filters, onFilterChange, showDepartment = true }) {
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (showDepartment) {
      api.get('/departments')
        .then((res) => setDepartments(res.data.departments || []))
        .catch(() => {});
    }
  }, [showDepartment]);

  const handlePreset = (preset) => {
    const now = new Date();
    let from = '';
    let to = '';

    if (preset === 'today') {
      from = to = getLocalDateStr(now);
    } else if (preset === 'week') {
      const day = now.getDay(); // 0 is Sunday
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diffToMonday);
      from = getLocalDateStr(monday);
      to = getLocalDateStr(now);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      from = getLocalDateStr(firstDay);
      to = getLocalDateStr(now);
    } else if (preset === 'year') {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      from = getLocalDateStr(firstDay);
      to = getLocalDateStr(now);
    }

    onFilterChange({
      ...filters,
      preset,
      from,
      to,
    });
  };

  const handleDateChange = (field, val) => {
    onFilterChange({
      ...filters,
      preset: 'custom',
      [field]: val,
    });
  };

  const handleDepartmentChange = (val) => {
    onFilterChange({
      ...filters,
      departmentId: val,
    });
  };

  const handleReset = () => {
    handlePreset('month');
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4 shadow-sm">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground mr-1 flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" /> Range:
        </span>
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'year', label: 'This Year' },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePreset(p.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filters.preset === p.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Date Pickers & Department dropdown */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={filters.from || ''}
            onChange={(e) => handleDateChange('from', e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            aria-label="To date"
            value={filters.to || ''}
            onChange={(e) => handleDateChange('to', e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {showDepartment && (
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              aria-label="Department filter"
              value={filters.departmentId || ''}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          title="Reset filters to this month"
          onClick={handleReset}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
