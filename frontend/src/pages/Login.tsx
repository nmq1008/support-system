import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
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
  const [email, setEmail] = useState(() => localStorage.getItem('hidesk_email') || 'superadmin@hidesk.vn');
  const [password, setPassword] = useState('Password@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState<boolean>(true);
  const [forgot, setForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      if (remember) localStorage.setItem('hidesk_email', email);
      else localStorage.removeItem('hidesk_email');
    } catch (err) {
      setError(apiError(err, t('auth.invalid')));
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotMsg(''); setLoading(true);
    try {
      const r = await api.post('/auth/forgot-password', { email });
      setForgotMsg(r.data.message || t('auth.forgotSent'));
    } catch (err) {
      setForgotMsg(apiError(err));
    } finally { setLoading(false); }
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
          {/* Company logo on the form side (Excel row 2) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className="brand-logo" style={{ width: 40, height: 40 }}><Icon name="ticket" size={22} /></span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)' }}>HiDesk</span>
          </div>
          {!forgot ? (
            <>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> {t('auth.remember')}
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setForgot(true); setForgotMsg(''); }}>{t('auth.forgot')}</button>
                </div>
                {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                  {loading ? <span className="spinner" /> : t('auth.loginBtn')}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 22, margin: '0 0 4px' }}>{t('auth.forgot')}</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>{t('auth.forgotHint')}</p>
              <form onSubmit={submitForgot} style={{ marginTop: 20 }}>
                <div className="field">
                  <label>{t('auth.email')}</label>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {forgotMsg && <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--success)' }}>{forgotMsg}</div>}
                <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>{loading ? <span className="spinner" /> : t('auth.forgotSubmit')}</button>
                <button type="button" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setForgot(false)}>← {t('common.back')}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
