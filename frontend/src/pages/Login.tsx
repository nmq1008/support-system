import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { apiError } from '../lib/api';
import { Icon } from '../components/Icon';

const DEMO = [
  ['superadmin@hidesk.vn', 'Super Admin'],
  ['csm@hidesk.vn', 'CSM'],
  ['devlead@hidesk.vn', 'Dev Lead'],
  ['dev@hidesk.vn', 'Dev'],
  ['gate@hidesk.vn', 'Gate'],
  ['custadmin@acme.com', 'Cust. Admin'],
  ['customer@acme.com', 'Customer'],
];

export function Login() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('superadmin@hidesk.vn');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(apiError(err, t('auth.invalid')));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ height: '100vh', overflow: 'auto', display: 'grid', gridTemplateColumns: '1fr', placeItems: 'center', background: 'linear-gradient(135deg,#2563EB 0%,#1E40AF 100%)' }}>
      <div style={{ display: 'flex', gap: 0, maxWidth: 860, width: '92%', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,.35)', flexWrap: 'wrap' }}>
        {/* Brand panel */}
        <div style={{ flex: '1 1 320px', background: 'rgba(255,255,255,.08)', color: '#fff', padding: 40, minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, fontWeight: 700 }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', color: '#2563EB', display: 'grid', placeItems: 'center' }}><Icon name="ticket" size={24} /></span>
            HiDesk
          </div>
          <p style={{ opacity: 0.85, marginTop: 8 }}>Ticket &amp; Support System — Service Operations (BHBT)</p>
          <div style={{ marginTop: 28, fontSize: 12, opacity: 0.9 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{t('auth.demoAccounts')}</div>
            <div style={{ display: 'grid', gap: 4 }}>
              {DEMO.map(([mail, label]) => (
                <button key={mail} onClick={() => setEmail(mail)} style={{ textAlign: 'left', background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                  <b>{label}</b> — {mail}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Form */}
        <div style={{ flex: '1 1 320px', background: 'var(--bg-surface)', padding: 40, minWidth: 280 }}>
          <button onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')} className="btn btn-ghost btn-sm" style={{ float: 'right' }}>{i18n.language === 'vi' ? 'EN' : 'VI'}</button>
          <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>{t('auth.welcome')}</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>{t('auth.subtitle')}</p>
          <form onSubmit={submit} style={{ marginTop: 20 }}>
            <div className="field">
              <label>{t('auth.email')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>{t('auth.password')}</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" /> : t('auth.loginBtn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
