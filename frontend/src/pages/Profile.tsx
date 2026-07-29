import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Avatar';

const NOTIF_TYPES = ['ticket_created', 'status_changed', 'assigned', 'sla_warning', 'comment', 'mention', 'ticket_resolved'];

export function Profile() {
  const { t } = useTranslation();
  const { user, setLanguage } = useAuth();
  const toast = useToast();
  const [cur, setCur] = useState('');
  const [nw, setNw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (nw !== confirm) { setError(t('profile.mismatch')); return; }
    setSaving(true);
    try {
      await api.patch('/auth/password', { currentPassword: cur, newPassword: nw });
      toast(t('profile.changed'), 'success');
      setCur(''); setNw(''); setConfirm('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function savePrefs(type: string, on: boolean) {
    const next = { ...prefs, [type]: on };
    setPrefs(next);
    try { await api.patch('/auth/notify-prefs', { prefs: next }); toast(t('profile.saved'), 'success'); }
    catch (e) { toast(apiError(e), 'error'); }
  }

  return (
    <>
      <div className="page-header"><div className="page-title-row"><h1 className="page-title">{t('profile.title')}</h1></div></div>
      <div className="content-scroll">
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', alignItems: 'start' }}>
          {/* Info */}
          <div className="card">
            <h3 className="card-title">{t('profile.info')}</h3>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
              <Avatar name={user?.name} size={56} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{user?.name}</div>
                <div className="subline">{user?.email}</div>
                <span className="tag-chip" style={{ background: 'var(--color-primary-10)', color: 'var(--color-primary)', marginTop: 4, display: 'inline-block' }}>{t(`roles.${user?.role}`)}</span>
              </div>
            </div>
            <div className="field">
              <label>{t('common.language')}</label>
              <select className="select" value={user?.language} onChange={(e) => setLanguage(e.target.value as 'vi' | 'en')}>
                <option value="vi">Tiếng Việt</option><option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Change password */}
          <div className="card">
            <h3 className="card-title">{t('profile.changePassword')}</h3>
            <form onSubmit={changePassword}>
              <div className="field"><label>{t('profile.current')} <span className="req">*</span></label>
                <input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} required /></div>
              <div className="field"><label>{t('profile.new')} <span className="req">*</span></label>
                <input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} required minLength={6} /></div>
              <div className="field"><label>{t('profile.confirm')} <span className="req">*</span></label>
                <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
              {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
              <button className="btn btn-primary" disabled={saving}>{saving ? <span className="spinner" /> : t('profile.changePassword')}</button>
            </form>
          </div>

          {/* Notification preferences */}
          <div className="card">
            <h3 className="card-title">{t('profile.notifPrefs')}</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {NOTIF_TYPES.map((type) => (
                <label key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                  <span>{t(`notifTypes.${type}`, type)}</span>
                  <input type="checkbox" checked={prefs[type] !== false} onChange={(e) => savePrefs(type, e.target.checked)} />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
