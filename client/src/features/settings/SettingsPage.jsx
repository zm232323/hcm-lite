import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Loader } from '../../components/shared/Loader';
import { ErrorState } from '../../components/shared/ErrorState';
import { getErrorMessage } from '../../lib/utils';
import { Save } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then((r) => setSettings(r.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (field, val) => setSettings((s) => ({ ...s, [field]: val }));

  const toggleWeekend = (day) => {
    setSettings((s) => ({
      ...s,
      weekend: s.weekend.includes(day) ? s.weekend.filter((d) => d !== day) : [...s.weekend, day],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaved(false);
    try {
      const res = await api.put('/settings', {
        companyName: settings.companyName,
        officeStart: settings.officeStart,
        graceMinutes: Number(settings.graceMinutes),
        halfDayHours: Number(settings.halfDayHours),
        weekend: settings.weekend,
        officeLat: settings.officeLat ? Number(settings.officeLat) : null,
        officeLng: settings.officeLng ? Number(settings.officeLng) : null,
        radiusMeters: Number(settings.radiusMeters),
      });
      setSettings(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} onRetry={() => { setError(''); setLoading(true); }} />;

  return (
    <div className="page-container max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">{isAdmin ? 'Configure your organisation settings' : 'View organisation settings'}</p>
        </div>
        {isAdmin && (
          <button id="save-settings" form="settings-form" type="submit" disabled={saving} className="btn-primary">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {saved && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-700 dark:text-green-300">Settings saved successfully.</div>}
      {saveError && <div className="mb-4 rounded-lg bg-red-100 border border-red-300 px-4 py-3 text-sm text-red-700">{saveError}</div>}

      <form id="settings-form" onSubmit={handleSave} className="space-y-6">
        {/* General */}
        <div className="card">
          <h2 className="text-base font-semibold text-foreground mb-4">General</h2>
          <div>
            <label className="form-label">Company Name</label>
            <input value={settings.companyName || ''} onChange={(e) => toggle('companyName', e.target.value)}
              disabled={!isAdmin} className="form-input" />
          </div>
        </div>

        {/* Attendance */}
        <div className="card">
          <h2 className="text-base font-semibold text-foreground mb-4">Attendance</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Office Start Time</label>
              <input type="time" value={settings.officeStart || '09:00'} onChange={(e) => toggle('officeStart', e.target.value)}
                disabled={!isAdmin} className="form-input" />
            </div>
            <div>
              <label className="form-label">Grace Period (minutes)</label>
              <input type="number" min="0" value={settings.graceMinutes ?? 15} onChange={(e) => toggle('graceMinutes', e.target.value)}
                disabled={!isAdmin} className="form-input" />
            </div>
            <div>
              <label className="form-label">Half-day threshold (hours)</label>
              <input type="number" min="0" step="0.5" value={settings.halfDayHours ?? 5} onChange={(e) => toggle('halfDayHours', e.target.value)}
                disabled={!isAdmin} className="form-input" />
            </div>
            <div>
              <label className="form-label">Geo-fence Radius (meters)</label>
              <input type="number" min="1" value={settings.radiusMeters ?? 150} onChange={(e) => toggle('radiusMeters', e.target.value)}
                disabled={!isAdmin} className="form-input" />
            </div>
            <div>
              <label className="form-label">Office Latitude</label>
              <input type="number" step="any" value={settings.officeLat ?? ''} onChange={(e) => toggle('officeLat', e.target.value)}
                disabled={!isAdmin} className="form-input" placeholder="e.g. 24.8607" />
            </div>
            <div>
              <label className="form-label">Office Longitude</label>
              <input type="number" step="any" value={settings.officeLng ?? ''} onChange={(e) => toggle('officeLng', e.target.value)}
                disabled={!isAdmin} className="form-input" placeholder="e.g. 67.0011" />
            </div>
          </div>
          <div className="mt-4">
            <label className="form-label">Weekend Days</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS.map((d, i) => (
                <button key={i} type="button" disabled={!isAdmin}
                  onClick={() => isAdmin && toggleWeekend(i)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    settings.weekend?.includes(i) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
