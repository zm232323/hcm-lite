import { useState, useEffect, useCallback } from 'react';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { getErrorMessage, formatDate } from '../../lib/utils';
import { Search, Filter } from 'lucide-react';

const ENTITIES = ['', 'User', 'Settings', 'Department', 'Designation', 'LeaveType', 'Holiday'];

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: '', entity: '', startDate: '', endDate: '' });

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 25 });
    if (filters.action) params.set('action', filters.action);
    if (filters.entity) params.set('entity', filters.entity);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);

    api.get(`/audit?${params}`)
      .then((r) => { setLogs(r.data.logs); setTotal(r.data.total); setTotalPages(r.data.totalPages); })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const handleFilterChange = (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const actionColor = (action) => {
    if (action.startsWith('CREATE')) return 'text-green-600 dark:text-green-400';
    if (action.startsWith('DELETE')) return 'text-red-600 dark:text-red-400';
    if (action.startsWith('UPDATE') || action.startsWith('RESET') || action.startsWith('ACTIVATE') || action.startsWith('DEACTIVATE')) return 'text-amber-600 dark:text-amber-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{total} events recorded</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input name="action" value={filters.action} onChange={handleFilterChange} placeholder="Action (e.g. CREATE_USER)" className="form-input" />
          <select name="entity" value={filters.entity} onChange={handleFilterChange} className="form-input">
            {ENTITIES.map((e) => <option key={e} value={e}>{e || 'All entities'}</option>)}
          </select>
          <div>
            <label className="form-label text-xs">From</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-input" />
          </div>
          <div>
            <label className="form-label text-xs">To</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-input" />
          </div>
        </div>
      </div>

      {loading ? <Loader /> : error ? <ErrorState message={error} onRetry={load} /> : logs.length === 0 ? (
        <EmptyState title="No audit events" description="Audit events will appear here as actions are performed." />
      ) : (
        <>
          <div className="table-container mb-4">
            <table className="table">
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <div className="text-xs">
                        <p className="font-medium text-foreground">{log.actorId?.name || 'System'}</p>
                        <p className="text-muted-foreground capitalize">{log.actorId?.role || log.actorRole}</p>
                      </div>
                    </td>
                    <td>
                      <code className={`text-xs font-mono ${actionColor(log.action)}`}>{log.action}</code>
                    </td>
                    <td className="text-xs text-muted-foreground">{log.entity}</td>
                    <td className="text-xs text-muted-foreground font-mono">{log.entityId ? `…${log.entityId.slice(-6)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary px-3 py-1.5 text-xs">Previous</button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-3 py-1.5 text-xs">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
